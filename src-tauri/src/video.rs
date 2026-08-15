//! Background footage fetched from Pexels and cached on disk.
//!
//! The app used to ship every backdrop it could ever show - 54MB of mp4 against
//! roughly 100KB of everything else. Now that genres are open-ended there could
//! never be enough bundled footage anyway, so clips are fetched per genre and
//! kept on disk. The bundled ones stay as the offline fallback.
//!
//! Pexels needs a free API key. Without one this module simply reports that it
//! has nothing, and the frontend falls back to the bundled videos - so the app
//! is fully functional with no key at all.

use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, SystemTime};

use serde::Deserialize;

const SEARCH_TIMEOUT: Duration = Duration::from_secs(10);
const DOWNLOAD_TIMEOUT: Duration = Duration::from_secs(120);
/// Backdrops are decoration; nothing here is worth a large download.
const MAX_DOWNLOAD_BYTES: u64 = 40 * 1024 * 1024;
const RESULTS_PER_QUERY: u32 = 15;
/// Clips collected per scene before we stop downloading and just rotate.
/// This is a backdrop somebody stares at for hours.
const PER_SCENE_TARGET: usize = 30;
/// Always asking for page 1 would cap a scene at the same 15 clips forever.
const SEARCH_PAGES: u32 = 6;
/// Roughly 720p: sharp enough behind a UI, a fraction of the 4K original.
const TARGET_WIDTH: u32 = 1280;
/// Disk the cache may occupy before the least recently used clips are dropped.
/// Thirty clips of a scene run to roughly 120MB, so this holds several scenes.
const CACHE_MAX_BYTES: u64 = 1024 * 1024 * 1024;

#[derive(Deserialize)]
struct SearchResponse {
    videos: Vec<Video>,
}

#[derive(Deserialize)]
struct Video {
    id: u64,
    #[serde(default)]
    duration: u32,
    video_files: Vec<VideoFile>,
}

#[derive(Deserialize)]
struct VideoFile {
    quality: Option<String>,
    file_type: Option<String>,
    width: Option<u32>,
    link: String,
}

fn hash_of(value: &str) -> u64 {
    let mut hasher = DefaultHasher::new();
    value.hash(&mut hasher);
    hasher.finish()
}

/// Picks the smallest file that still looks good full-screen.
///
/// Pexels offers the same clip from 640px up to 4K; the 4K version of a blurred
/// background is a pointless download.
fn best_file(video: &Video) -> Option<&VideoFile> {
    let mp4: Vec<&VideoFile> = video
        .video_files
        .iter()
        .filter(|file| {
            file.file_type.as_deref() == Some("video/mp4")
                // HLS entries carry no dimensions and cannot be saved as a file.
                && file.quality.as_deref() != Some("hls")
                && file.width.is_some()
        })
        .collect();

    mp4.iter()
        .filter(|file| file.width.unwrap_or(0) >= TARGET_WIDTH)
        .min_by_key(|file| file.width.unwrap_or(u32::MAX))
        .or_else(|| mp4.iter().max_by_key(|file| file.width.unwrap_or(0)))
        .copied()
}

fn agent(timeout: Duration) -> ureq::Agent {
    ureq::Agent::config_builder()
        .timeout_global(Some(timeout))
        .build()
        .into()
}

pub struct VideoLibrary {
    cache_dir: PathBuf,
    api_key: Option<String>,
    /// Serialises downloads so a burst of genre switches cannot pile them up.
    fetching: Mutex<()>,
    /// Set while a pool is being filled, so switching genres quickly cannot
    /// start a dozen fills racing each other.
    filling: AtomicBool,
}

impl VideoLibrary {
    pub fn new(cache_dir: PathBuf, api_key: Option<String>) -> Self {
        let _ = fs::create_dir_all(&cache_dir);
        Self {
            cache_dir,
            api_key,
            fetching: Mutex::new(()),
            filling: AtomicBool::new(false),
        }
    }

    pub fn has_key(&self) -> bool {
        self.api_key.is_some()
    }

    fn prefix(query: &str) -> String {
        format!("{:016x}", hash_of(query))
    }

    /// The filename prefix used for a scene. Public so tests can seed the cache.
    pub fn cache_prefix(&self, scene: &str) -> String {
        Self::prefix(scene)
    }

    /// Clips already on disk for this scene.
    fn cached(&self, scene: &str) -> Vec<PathBuf> {
        let prefix = Self::prefix(scene);
        let Ok(entries) = fs::read_dir(&self.cache_dir) else {
            return Vec::new();
        };

        entries
            .flatten()
            .map(|entry| entry.path())
            .filter(|path| {
                path.file_name()
                    .and_then(|name| name.to_str())
                    .is_some_and(|name| name.starts_with(&prefix) && name.ends_with(".mp4"))
            })
            .collect()
    }

    /// Drops the least recently used clips once the cache outgrows its budget.
    ///
    /// Measured in bytes rather than files because clip sizes vary by an order
    /// of magnitude, and it is the disk usage anyone would actually care about.
    fn evict(&self) {
        let Ok(entries) = fs::read_dir(&self.cache_dir) else {
            return;
        };

        let mut files: Vec<(PathBuf, SystemTime, u64)> = entries
            .flatten()
            .filter_map(|entry| {
                let path = entry.path();
                let meta = entry.metadata().ok()?;
                path.extension()?
                    .eq("mp4")
                    .then_some((path, meta.modified().ok()?, meta.len()))
            })
            .collect();

        let mut total: u64 = files.iter().map(|(_, _, size)| size).sum();
        if total <= CACHE_MAX_BYTES {
            return;
        }

        files.sort_by_key(|(_, modified, _)| *modified);
        for (path, _, size) in &files {
            if total <= CACHE_MAX_BYTES {
                break;
            }
            if fs::remove_file(path).is_ok() {
                total = total.saturating_sub(*size);
            }
        }
    }

    fn search(&self, query: &str) -> Option<Vec<Video>> {
        let key = self.api_key.as_deref()?;
        // A random page keeps a scene from being forever the same top results.
        let page = 1 + (rand::random::<u64>() % SEARCH_PAGES as u64);
        let url = format!(
            "https://api.pexels.com/videos/search?query={}&per_page={}&page={}&orientation=landscape&size=medium",
            crate::text::percent_encode(query),
            RESULTS_PER_QUERY,
            page
        );

        let body = agent(SEARCH_TIMEOUT)
            .get(&url)
            .header("Authorization", key)
            .header("User-Agent", "minke-fm/0.1")
            .call()
            .ok()?
            .body_mut()
            .read_to_string()
            .ok()?;

        let parsed: SearchResponse = serde_json::from_str(&body).ok()?;
        Some(parsed.videos)
    }

    fn download(&self, scene: &str, video: &Video, file: &VideoFile) -> Option<PathBuf> {
        let target = self
            .cache_dir
            .join(format!("{}_{}.mp4", Self::prefix(scene), video.id));
        if target.exists() {
            return Some(target);
        }

        let bytes = agent(DOWNLOAD_TIMEOUT)
            .get(&file.link)
            .header("User-Agent", "minke-fm/0.1")
            .call()
            .ok()?
            .body_mut()
            .with_config()
            .limit(MAX_DOWNLOAD_BYTES)
            .read_to_vec()
            .ok()?;

        // Write beside the target and rename, so a download interrupted halfway
        // can never leave a truncated file that later looks like a cache hit.
        let partial = target.with_extension("part");
        fs::write(&partial, &bytes).ok()?;
        fs::rename(&partial, &target).ok()?;

        self.evict();
        Some(target)
    }

    /// A clip to show right now.
    ///
    /// Anything already on disk is served immediately - waiting on a download
    /// while a perfectly good clip sits in the cache would make every press of
    /// G feel broken. Only an empty pool blocks on the network.
    ///
    /// `avoid` is the path currently on screen, so asking again gives something
    /// different rather than the same clip back.
    pub fn clip_for(&self, scene: &str, queries: &[String], recent: &[String]) -> Option<PathBuf> {
        let unseen = |path: &PathBuf| {
            path.to_str()
                .is_some_and(|path| !recent.iter().any(|seen| seen == path))
        };

        let cached = self.cached(scene);
        if let Some(path) = pick_random(&cached, unseen) {
            return Some(path);
        }
        // Everything cached has been shown recently. Better to repeat than to
        // stall, and the caller's history will have moved on by next time.
        if !cached.is_empty() {
            return pick_random(&cached, |_| true);
        }

        self.fetch_one(scene, queries)
    }

    /// True while this scene has fewer clips than it should.
    pub fn needs_more(&self, scene: &str) -> bool {
        self.cached(scene).len() < PER_SCENE_TARGET
    }

    /// Fills this scene's pool up to target, one clip at a time.
    ///
    /// Runs on its own thread after a clip has been served, so the collection
    /// grows while the user listens instead of only when they ask for a change.
    /// Waiting for a download on every press of G is what made it feel as
    /// though there were only ever two clips.
    pub fn top_up(&self, scene: &str, queries: &[String]) {
        // Another fill is already running; a second would only queue behind it.
        if self.filling.swap(true, Ordering::SeqCst) {
            return;
        }

        let mut misses = 0;
        while self.needs_more(scene) {
            if self.fetch_one(scene, queries).is_some() {
                misses = 0;
                continue;
            }
            // One search term running dry does not mean the scene has; give the
            // others a turn before giving up on the whole pool.
            misses += 1;
            if misses >= queries.len().max(1) * 2 {
                break;
            }
        }

        self.filling.store(false, Ordering::SeqCst);
    }

    /// Downloads one more clip for this scene, skipping any already held.
    ///
    /// A scene draws on several search terms - one term alone yields the same
    /// handful of clips no matter how many pages are asked for.
    fn fetch_one(&self, scene: &str, queries: &[String]) -> Option<PathBuf> {
        let _guard = self.fetching.lock().ok()?;

        let cached = self.cached(scene);
        if cached.len() >= PER_SCENE_TARGET {
            return None;
        }

        let already: Vec<String> = cached
            .iter()
            .filter_map(|path| path.file_name()?.to_str().map(str::to_string))
            .collect();

        if queries.is_empty() {
            return None;
        }
        let query = &queries[(rand::random::<u64>() % queries.len() as u64) as usize];

        // Not `?`: with no API key or no network there is nothing to search,
        // but whatever is already on disk is still perfectly playable.
        let videos = self.search(query).unwrap_or_default();

        for video in &videos {
            // A three-second clip loops too obviously to use as a backdrop.
            if video.duration > 0 && video.duration < 8 {
                continue;
            }
            let name = format!("{}_{}.mp4", Self::prefix(scene), video.id);
            if already.contains(&name) {
                continue;
            }
            let Some(file) = best_file(video) else { continue };
            if let Some(path) = self.download(scene, video, file) {
                return Some(path);
            }
        }

        None
    }
}

fn pick_random(paths: &[PathBuf], accept: impl Fn(&PathBuf) -> bool) -> Option<PathBuf> {
    let usable: Vec<&PathBuf> = paths.iter().filter(|path| accept(path)).collect();
    if usable.is_empty() {
        return None;
    }
    let index = (rand::random::<u64>() % usable.len() as u64) as usize;
    Some(usable[index].clone())
}

fn non_empty(value: &str) -> Option<String> {
    let trimmed = value.trim().trim_matches(['"', '\'']).trim();
    (!trimmed.is_empty()).then(|| trimmed.to_string())
}

/// Pulls one key out of a `.env` file. Deliberately minimal - this is a dev
/// convenience, not a general dotenv implementation.
fn key_from_env_file(path: &Path, name: &str) -> Option<String> {
    let contents = fs::read_to_string(path).ok()?;

    for line in contents.lines() {
        let line = line.trim().strip_prefix("export ").unwrap_or(line.trim());
        if line.starts_with('#') {
            continue;
        }
        let Some((found, value)) = line.split_once('=') else {
            continue;
        };
        if found.trim() == name {
            return non_empty(value);
        }
    }
    None
}

/// Finds the Pexels key, in order of how deliberate each location is.
///
/// A bundled app has no working directory to speak of, so `.env` only ever
/// helps during development; `pexels.key` in the config directory is the one
/// that works for an installed copy.
pub fn read_api_key(config_dir: &Path) -> Option<String> {
    const NAME: &str = "PEXELS_API_KEY";

    if let Ok(value) = std::env::var(NAME) {
        if let Some(key) = non_empty(&value) {
            return Some(key);
        }
    }

    if let Ok(cwd) = std::env::current_dir() {
        // Running under `tauri dev` puts us in src-tauri/, so the project root
        // is one level up - check both.
        for candidate in [cwd.join(".env"), cwd.join("../.env")] {
            if let Some(key) = key_from_env_file(&candidate, NAME) {
                return Some(key);
            }
        }
    }

    key_from_env_file(&config_dir.join("pexels.key"), NAME)
        .or_else(|| non_empty(&fs::read_to_string(config_dir.join("pexels.key")).ok()?))
}

#[cfg(test)]
mod tests {
    use super::{best_file, Video, VideoFile};

    fn file(width: Option<u32>, file_type: &str, quality: &str) -> VideoFile {
        VideoFile {
            quality: Some(quality.into()),
            file_type: Some(file_type.into()),
            width,
            link: format!("https://example.test/{}", width.unwrap_or(0)),
        }
    }

    fn video(files: Vec<VideoFile>) -> Video {
        Video {
            id: 1,
            duration: 30,
            video_files: files,
        }
    }

    #[test]
    fn takes_the_smallest_file_that_is_still_big_enough() {
        let clip = video(vec![
            file(Some(640), "video/mp4", "sd"),
            file(Some(1920), "video/mp4", "hd"),
            file(Some(1280), "video/mp4", "hd"),
            file(Some(4096), "video/mp4", "hd"),
        ]);
        assert_eq!(best_file(&clip).unwrap().width, Some(1280));
    }

    #[test]
    fn falls_back_to_the_largest_when_all_are_small() {
        let clip = video(vec![
            file(Some(640), "video/mp4", "sd"),
            file(Some(960), "video/mp4", "sd"),
        ]);
        assert_eq!(best_file(&clip).unwrap().width, Some(960));
    }

    #[test]
    fn skips_hls_and_other_containers() {
        // HLS has no dimensions and cannot be saved as a single file.
        let clip = video(vec![
            file(None, "video/mp4", "hls"),
            file(Some(1280), "video/quicktime", "hd"),
        ]);
        assert!(best_file(&clip).is_none());
    }

    #[test]
    fn reports_nothing_when_there_are_no_files() {
        assert!(best_file(&video(vec![])).is_none());
    }

    #[test]
    fn reads_a_key_out_of_a_dotenv_file() {
        use super::key_from_env_file;
        let path = std::env::temp_dir().join("minke-dotenv-test");
        std::fs::write(
            &path,
            "# a comment\nOTHER=zzz\nexport PEXELS_API_KEY=\"abc123\"\n",
        )
        .unwrap();

        assert_eq!(
            key_from_env_file(&path, "PEXELS_API_KEY"),
            Some("abc123".to_string())
        );
        assert_eq!(key_from_env_file(&path, "MISSING"), None);
    }

    #[test]
    fn ignores_a_key_that_is_present_but_blank() {
        use super::key_from_env_file;
        let path = std::env::temp_dir().join("minke-dotenv-blank");
        std::fs::write(&path, "PEXELS_API_KEY=   \n").unwrap();
        assert_eq!(key_from_env_file(&path, "PEXELS_API_KEY"), None);
    }
}
