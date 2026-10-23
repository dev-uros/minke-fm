import {ref, Ref} from "vue";
import {NowPlaying} from "./useNowPlaying.ts";

/**
 * Songs heard, newest first.
 *
 * Only what `useNowPlaying` already confirmed as a track ever gets here - a
 * station ident is never recorded - and the album and artwork are whatever the
 * verified store match produced, so the list keeps the same "correct or
 * nothing" rule as the screen.
 *
 * Module-level, like the favourites: both roots share it, and it has to outlive
 * the modal that shows it.
 */

export interface HeardTrack {
    artist: string;
    song: string;
    album?: string;
    artwork?: string;
    year?: string;
    /** The station it was heard on. */
    station: string;
    /** When it was first announced, in epoch milliseconds. */
    heardAt: number;
}

const STORAGE_KEY = 'track-history';
/** An evening or two of listening; older songs fall off the end. */
const LIMIT = 200;

const history: Ref<HeardTrack[]> = ref([]);
let loaded = false;

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value));
    } catch {
        // Quota or private mode - the list still works for this session.
    }
}

function load() {
    if (loaded) return;
    loaded = true;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) history.value = JSON.parse(stored) as HeardTrack[];
    } catch {
        history.value = [];
    }
}

const sameTrack = (a: {artist: string; song: string}, b: {artist: string; song: string}) =>
    a.artist === b.artist && a.song === b.song;

/**
 * Records the track on screen. Called again for the same track when its album
 * lookup lands, which fills in the entry already there rather than adding one;
 * a station repeating its title after a reconnect lands here too.
 */
export function recordTrack(track: NowPlaying, station: string) {
    load();
    const latest = history.value[0];

    if (latest && sameTrack(latest, track) && latest.station === station) {
        history.value[0] = {
            ...latest,
            album: track.album ?? latest.album,
            artwork: track.artwork ?? latest.artwork,
            year: track.year ?? latest.year
        };
        persist();
        return;
    }

    history.value.unshift({
        artist: track.artist,
        song: track.song,
        album: track.album,
        artwork: track.artwork,
        year: track.year,
        station,
        heardAt: Date.now()
    });
    if (history.value.length > LIMIT) history.value.length = LIMIT;
    persist();
}

export function useTrackHistory() {
    load();

    const clear = () => {
        history.value = [];
        persist();
    };

    return {history, clear};
}
