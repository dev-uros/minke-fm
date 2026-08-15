//! Lyrics lookup against LRCLIB.
//!
//! Timed (karaoke) lyrics were tried and removed. The timing itself worked, but
//! LRCLIB times against one specific recording and radio plays another - a radio
//! edit, a remaster, a live take, a lofi cover. That error *grows* through the
//! song rather than staying constant, so no offset can correct it, and the real
//! duration is only knowable once the song has already finished. What is left
//! here is the transcript, which is right whichever recording is playing.
//!
//! Coverage is modest by nature: across this app's genres only about a third of
//! tracks have lyrics at all, because lofi, synthwave and jazz are largely
//! instrumental. "Nothing found" is an ordinary, silent outcome.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::text::{normalize, percent_encode, same, without_brackets};

const LOOKUP_TIMEOUT: Duration = Duration::from_secs(8);
const CACHE_LIMIT: usize = 128;
/// Search fallback returns many rows; only the plausible few are worth checking.
const MAX_CANDIDATES: usize = 8;

#[derive(Debug, Clone, Serialize)]
pub struct Lyrics {
    /// The transcript, one entry per line. Never empty.
    pub lines: Vec<String>,
}

#[derive(Deserialize)]
struct LrclibTrack {
    #[serde(rename = "artistName")]
    artist_name: Option<String>,
    #[serde(rename = "trackName")]
    track_name: Option<String>,
    instrumental: Option<bool>,
    #[serde(rename = "plainLyrics")]
    plain_lyrics: Option<String>,
    #[serde(rename = "syncedLyrics")]
    synced_lyrics: Option<String>,
}

/// Removes the `[01:23.45]` stamps from an LRC transcript.
///
/// Some entries carry only the timed version, so stripping it is what keeps
/// those tracks from being lost along with the timing. Rows whose brackets hold
/// metadata rather than a timestamp - `[ar:Muse]`, `[length:03:47]` - are not
/// lyrics and are dropped.
pub fn strip_lrc_timestamps(raw: &str) -> Vec<String> {
    let mut out = Vec::new();

    for row in raw.lines() {
        let mut rest = row;
        let mut stamped = false;
        let mut metadata = false;

        while rest.starts_with('[') {
            let Some(close) = rest.find(']') else { break };
            if is_timestamp(&rest[1..close]) {
                stamped = true;
            } else {
                metadata = true;
                break;
            }
            rest = &rest[close + 1..];
        }

        if metadata {
            continue;
        }
        // A row with no stamp at all is already a plain transcript line.
        let _ = stamped;
        out.push(rest.trim().to_string());
    }

    out
}

/// `mm:ss`, `mm:ss.xx` or `mm:ss.xxx`.
fn is_timestamp(tag: &str) -> bool {
    let Some((minutes, rest)) = tag.split_once(':') else {
        return false;
    };
    let Ok(minutes) = minutes.trim().parse::<f64>() else {
        return false;
    };
    let Ok(seconds) = rest.trim().parse::<f64>() else {
        return false;
    };
    minutes.is_finite() && seconds.is_finite() && seconds < 60.0
}

/// Drops leading and trailing blank lines, and collapses runs of them.
fn tidy(mut lines: Vec<String>) -> Vec<String> {
    lines.dedup_by(|a, b| a.is_empty() && b.is_empty());
    while lines.first().is_some_and(|line| line.is_empty()) {
        lines.remove(0);
    }
    while lines.last().is_some_and(|line| line.is_empty()) {
        lines.pop();
    }
    lines
}

fn agent() -> ureq::Agent {
    ureq::Agent::config_builder()
        .timeout_global(Some(LOOKUP_TIMEOUT))
        .build()
        .into()
}

fn get_json(url: &str) -> Option<String> {
    agent()
        .get(url)
        .header("User-Agent", "minke-fm/0.1 (https://github.com/dev-uros)")
        .call()
        .ok()?
        .body_mut()
        .read_to_string()
        .ok()
}

fn into_lyrics(track: LrclibTrack) -> Option<Lyrics> {
    // LRCLIB marks instrumentals explicitly; there is nothing to show for them.
    if track.instrumental.unwrap_or(false) {
        return None;
    }

    let lines = match track.plain_lyrics.as_deref() {
        Some(text) if !text.trim().is_empty() => {
            text.lines().map(|line| line.trim().to_string()).collect()
        }
        // Timed-only entries still hold the words.
        _ => strip_lrc_timestamps(track.synced_lyrics.as_deref()?),
    };

    let lines = tidy(lines);
    if lines.iter().all(|line| line.is_empty()) {
        return None;
    }

    Some(Lyrics { lines })
}

fn search(artist: &str, song: &str) -> Option<Lyrics> {
    let artist_term = without_brackets(artist);
    let song_term = without_brackets(song);

    // The exact endpoint first - when it hits, it is the right recording.
    let direct = format!(
        "https://lrclib.net/api/get?artist_name={}&track_name={}",
        percent_encode(&artist_term),
        percent_encode(&song_term)
    );
    if let Some(body) = get_json(&direct) {
        if let Ok(track) = serde_json::from_str::<LrclibTrack>(&body) {
            // Verified even here: never show words we cannot tie to this track.
            let agrees = track
                .artist_name
                .as_deref()
                .is_some_and(|name| same(artist, name))
                && track
                    .track_name
                    .as_deref()
                    .is_some_and(|name| same(song, name));

            if agrees {
                if let Some(lyrics) = into_lyrics(track) {
                    return Some(lyrics);
                }
            }
        }
    }

    // Otherwise fall back to search, and verify the same way.
    let query = format!(
        "https://lrclib.net/api/search?artist_name={}&track_name={}",
        percent_encode(&artist_term),
        percent_encode(&song_term)
    );
    let body = get_json(&query)?;
    let candidates: Vec<LrclibTrack> = serde_json::from_str(&body).ok()?;

    candidates
        .into_iter()
        .take(MAX_CANDIDATES)
        .find_map(|track| {
            if !same(artist, track.artist_name.as_deref()?) {
                return None;
            }
            if !same(song, track.track_name.as_deref()?) {
                return None;
            }
            into_lyrics(track)
        })
}

/// Shared by clone, so handing a copy to a worker thread shares the same map.
#[derive(Default, Clone)]
pub struct LyricsCache {
    entries: Arc<Mutex<HashMap<String, Option<Lyrics>>>>,
}

impl LyricsCache {
    pub fn lookup(&self, artist: &str, song: &str) -> Option<Lyrics> {
        let key = format!("{}\u{1}{}", normalize(artist), normalize(song));

        if let Some(hit) = self.entries.lock().unwrap().get(&key) {
            return hit.clone();
        }

        let found = search(artist, song);

        let mut entries = self.entries.lock().unwrap();
        if entries.len() >= CACHE_LIMIT {
            entries.clear();
        }
        entries.insert(key, found.clone());

        found
    }
}

#[cfg(test)]
mod tests {
    use super::{is_timestamp, strip_lrc_timestamps, tidy};

    #[test]
    fn recognises_timestamps_in_every_shape() {
        assert!(is_timestamp("00:41.16"));
        assert!(is_timestamp("01:00"));
        assert!(is_timestamp("02:03.456"));
    }

    #[test]
    fn rejects_metadata_tags_and_nonsense() {
        assert!(!is_timestamp("ar:Muse"));
        assert!(!is_timestamp("length"));
        // 60 seconds would mean the minutes field was wrong.
        assert!(!is_timestamp("00:60.00"));
    }

    #[test]
    fn strips_stamps_and_drops_metadata_rows() {
        let lines = strip_lrc_timestamps(
            "[ar:Muse]\n[00:41.16] It's bugging me\n[00:43.62] Grating me",
        );
        assert_eq!(lines, vec!["It's bugging me", "Grating me"]);
    }

    #[test]
    fn keeps_a_repeated_line_once_per_row() {
        // Two stamps, one row of words - the transcript should read it once.
        assert_eq!(
            strip_lrc_timestamps("[00:10.00][01:20.00] Chorus line"),
            vec!["Chorus line"]
        );
    }

    #[test]
    fn trims_blank_padding_without_flattening_verses() {
        let tidied = tidy(vec![
            "".into(), "First".into(), "".into(), "".into(), "Second".into(), "".into(),
        ]);
        assert_eq!(tidied, vec!["First", "", "Second"]);
    }
}
