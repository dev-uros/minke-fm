//! Cache behaviour of the backdrop library, with no network involved.
//!
//! These run by default: they only touch a temp directory.
use minke_fm_lib::video::VideoLibrary;

/// Search terms are irrelevant here - nothing in these tests reaches the network.
fn q() -> Vec<String> {
    vec!["anything".to_string()]
}
use std::fs;

fn temp_dir(name: &str) -> std::path::PathBuf {
    let dir = std::env::temp_dir().join(format!("minke-video-test-{name}"));
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).unwrap();
    dir
}

#[test]
fn serves_cached_clips_when_there_is_no_api_key() {
    let dir = temp_dir("nokey");
    let library = VideoLibrary::new(dir.clone(), None);
    assert!(!library.has_key());

    // Nothing cached and no key: an honest miss, so the UI uses a bundled clip.
    assert!(library.clip_for("lofi", &q(), &[]).is_none());

    // Seed the cache the way a previous session would have.
    let prefix = library.cache_prefix("lofi");
    for id in [11u64, 22] {
        fs::write(dir.join(format!("{prefix}_{id}.mp4")), b"not really a video").unwrap();
    }

    // A key is needed to fetch, never to replay what is already on disk.
    let found = library.clip_for("lofi", &q(), &[]).expect("cached clip");
    assert!(found.starts_with(&dir));
    assert!(found.to_str().unwrap().contains(&prefix));
}

#[test]
fn keeps_queries_apart() {
    let dir = temp_dir("queries");
    let library = VideoLibrary::new(dir.clone(), None);

    let prefix = library.cache_prefix("synthwave");
    fs::write(dir.join(format!("{prefix}_1.mp4")), b"x").unwrap();
    fs::write(dir.join(format!("{prefix}_2.mp4")), b"x").unwrap();

    // A clip cached for one scene must not be handed to a different one.
    assert!(library.clip_for("synthwave", &q(), &[]).is_some());
    assert!(library.clip_for("rock", &q(), &[]).is_none());
}

#[test]
fn avoids_handing_back_the_clip_already_on_screen() {
    let dir = temp_dir("avoid");
    let library = VideoLibrary::new(dir.clone(), None);

    let prefix = library.cache_prefix("folk");
    let a = dir.join(format!("{prefix}_1.mp4"));
    let b = dir.join(format!("{prefix}_2.mp4"));
    fs::write(&a, b"x").unwrap();
    fs::write(&b, b"x").unwrap();

    let next = library.clip_for("folk", &q(), &[a.to_str().unwrap().to_string()]).expect("the other clip");
    assert_eq!(next, b, "pressing G must change the picture");
}

#[test]
fn never_repeats_a_clip_while_it_is_still_in_recent_history() {
    let dir = temp_dir("history");
    let library = VideoLibrary::new(dir.clone(), None);

    let prefix = library.cache_prefix("lofi");
    for id in 0..30u64 {
        fs::write(dir.join(format!("{prefix}_{id}.mp4")), b"x").unwrap();
    }

    // Mirrors the frontend: remember the last ten, newest first.
    const HISTORY: usize = 10;
    let mut recent: Vec<String> = Vec::new();

    // Fifty presses of G is far more than anyone does in a sitting.
    for press in 0..50 {
        let path = library
            .clip_for("lofi", &q(), &recent)
            .expect("a pool of thirty always has something")
            .to_str()
            .unwrap()
            .to_string();

        assert!(
            !recent.contains(&path),
            "press {press} repeated a clip still in the last {HISTORY}"
        );

        recent.insert(0, path);
        recent.truncate(HISTORY);
    }
}

#[test]
fn repeats_rather_than_stalling_when_the_pool_is_smaller_than_the_history() {
    let dir = temp_dir("small-pool");
    let library = VideoLibrary::new(dir.clone(), None);

    let prefix = library.cache_prefix("folk");
    let only = dir.join(format!("{prefix}_1.mp4"));
    fs::write(&only, b"x").unwrap();

    // One clip and it has just been shown: showing it again beats a blank screen.
    let recent = vec![only.to_str().unwrap().to_string()];
    assert_eq!(library.clip_for("folk", &q(), &recent), Some(only));
}
