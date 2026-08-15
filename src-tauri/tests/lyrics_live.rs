//! Checks the lyrics path end to end against the live LRCLIB API.
//!
//! Ignored by default: it talks to the network. Run after touching `lyrics.rs`:
//!
//!     cargo test --test lyrics_live -- --ignored --nocapture
use minke_fm_lib::lyrics::LyricsCache;

#[test]
#[ignore]
fn fetches_a_transcript_and_refuses_what_it_cannot_confirm() {
    let cache = LyricsCache::default();

    let found = cache.lookup("Muse", "Hysteria").expect("Hysteria has lyrics");
    assert!(!found.lines.is_empty(), "expected a transcript");

    for line in found.lines.iter().take(6) {
        println!("  {line}");
    }
    println!("({} lines)", found.lines.len());

    // Timestamps must not survive into what we display.
    let stamped = found.lines.iter().find(|line| line.starts_with('['));
    assert!(stamped.is_none(), "found a leftover LRC stamp: {stamped:?}");

    // A netlabel instrumental has nothing to show, and that must be a clean miss.
    assert!(cache.lookup("PixelNatureWave", "Parallel Sky").is_none());

    // A lofi cover must not pick up the original recording's words: the artist
    // is the cover channel, so nothing should verify.
    let cover = cache.lookup("Chill With Lofi", "I Hate Myself for Loving You");
    println!("lofi cover -> {:?}", cover.is_none());
    assert!(cover.is_none(), "a cover must not inherit the original's lyrics");
}
