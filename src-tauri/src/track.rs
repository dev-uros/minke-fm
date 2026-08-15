//! Album lookup for the track ICY told us about.
//!
//! ICY only ever gives "Artist - Song", so an album has to come from elsewhere.
//! The iTunes Search API has it and needs no key - but it is a fuzzy search that
//! *always* returns something plausible, so a raw first result would happily
//! label a station ident with somebody's greatest-hits record. Every candidate
//! is therefore checked against the artist *and* the song before we believe it.
//! Nothing that fails the check is shown at all.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::text::{normalize, percent_encode, same, without_brackets};

const LOOKUP_TIMEOUT: Duration = Duration::from_secs(8);
/// The best match is not always first, so check a handful.
const MAX_CANDIDATES: usize = 5;
/// Stations repeat tracks constantly; remembering misses matters as much as hits.
const CACHE_LIMIT: usize = 256;

#[derive(Debug, Clone, Serialize)]
pub struct TrackInfo {
    pub album: String,
    pub artwork: Option<String>,
    pub year: Option<String>,
}

#[derive(Deserialize)]
struct SearchResponse {
    results: Vec<SearchResult>,
}

#[derive(Deserialize)]
struct SearchResult {
    #[serde(rename = "artistName")]
    artist_name: Option<String>,
    #[serde(rename = "trackName")]
    track_name: Option<String>,
    #[serde(rename = "collectionName")]
    collection_name: Option<String>,
    #[serde(rename = "artworkUrl100")]
    artwork_url_100: Option<String>,
    #[serde(rename = "releaseDate")]
    release_date: Option<String>,
}

fn search(artist: &str, song: &str) -> Option<TrackInfo> {
    let term = percent_encode(&format!(
        "{} {}",
        without_brackets(artist),
        without_brackets(song)
    ));
    let url = format!(
        "https://itunes.apple.com/search?term={term}&entity=song&country=US&limit={MAX_CANDIDATES}"
    );

    let agent: ureq::Agent = ureq::Agent::config_builder()
        .timeout_global(Some(LOOKUP_TIMEOUT))
        .build()
        .into();

    let body = agent
        .get(&url)
        .header("User-Agent", "minke-fm/0.1")
        .call()
        .ok()?
        .body_mut()
        .read_to_string()
        .ok()?;

    let response: SearchResponse = serde_json::from_str(&body).ok()?;

    response.results.into_iter().find_map(|result| {
        // Both halves must agree, which is what stops an ident like
        // "EUROPE 2 - POP RADIO" from picking up a Europe album.
        if !same(artist, result.artist_name.as_deref()?) {
            return None;
        }
        if !same(song, result.track_name.as_deref()?) {
            return None;
        }

        Some(TrackInfo {
            album: result.collection_name?,
            // The 100px thumbnail URL scales just by asking for a bigger size.
            artwork: result
                .artwork_url_100
                .map(|url| url.replace("100x100bb", "300x300bb")),
            year: result
                .release_date
                .and_then(|date| date.get(..4).map(str::to_string)),
        })
    })
}

/// Shared by clone, so handing a copy to a worker thread shares the same map.
#[derive(Default, Clone)]
pub struct TrackCache {
    /// `None` records a confirmed miss, so we do not ask again for every repeat.
    entries: Arc<Mutex<HashMap<String, Option<TrackInfo>>>>,
}

impl TrackCache {
    pub fn lookup(&self, artist: &str, song: &str) -> Option<TrackInfo> {
        let key = format!("{}\u{1}{}", normalize(artist), normalize(song));

        if let Some(hit) = self.entries.lock().unwrap().get(&key) {
            return hit.clone();
        }

        let found = search(artist, song);

        let mut entries = self.entries.lock().unwrap();
        // A radio session is long; do not let this grow without bound.
        if entries.len() >= CACHE_LIMIT {
            entries.clear();
        }
        entries.insert(key, found.clone());

        found
    }
}
