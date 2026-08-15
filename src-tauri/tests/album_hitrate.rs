//! How often a confirmed album is actually found, measured against the live
//! iTunes API using titles captured from real stations.
//!
//! Ignored by default: it talks to the network and is paced to stay inside the
//! API's rate limit, so it takes about a minute. Run it after touching the
//! matching rules in `track.rs`:
//!
//!     cargo test --test album_hitrate -- --ignored --nocapture
//!
//! What matters is not just the hit count but that no line is *wrong* - a
//! confirmed album that does not belong to the track is the failure this whole
//! verification step exists to prevent.
use minke_fm_lib::track::TrackCache;

#[test]
#[ignore]
fn album_hit_rate_on_real_titles() {
    let raw = std::fs::read_to_string("tests/accepted.json").unwrap();
    let tracks: Vec<(String, String)> = serde_json::from_str(&raw).unwrap();
    let cache = TrackCache::default();

    let (mut hit, mut miss) = (0, 0);
    for (artist, song) in &tracks {
        match cache.lookup(artist, song) {
            Some(info) => {
                hit += 1;
                println!("OK   {artist} - {song}\n     -> {} ({:?})", info.album, info.year);
            }
            None => {
                miss += 1;
                println!("NONE {artist} - {song}");
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(2500));
    }
    println!("\nalbum found: {hit} / {} | nothing shown: {miss}", tracks.len());
}
