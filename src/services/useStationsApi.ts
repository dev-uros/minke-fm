import {FormattedStation, Genre, Station} from "../types";
import {formatStations} from "./useStationFormat.ts";

/**
 * Station lists come from radio-browser, which is a pool of volunteer mirrors -
 * any single host can be down or slow. We try them in order, and cache each
 * genre so a cold start with no internet still gives a working app.
 *
 * Genres are fetched one at a time, on demand. There are thousands of playable
 * tags, so loading everything up front stopped being possible the moment the
 * genre list stopped being a fixed twelve.
 */

const API_HOSTS = [
    'https://de1.api.radio-browser.info',
    'https://de2.api.radio-browser.info',
    'https://nl1.api.radio-browser.info',
    'https://at1.api.radio-browser.info'
];

const REQUEST_TIMEOUT_MS = 8_000;
/**
 * The top few hundred by popularity is what anyone actually listens to, and it
 * is a fraction of the bytes of an unbounded tag like "rock".
 */
const STATIONS_PER_GENRE = 200;

const CACHE_PREFIX = 'minke-fm:stations:v2:';
/** Matches every version, so clearing also sweeps up formats no longer read. */
const CACHE_FAMILY = 'minke-fm:stations';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
/** Old genres are evicted so a session of browsing cannot fill localStorage. */
const CACHED_GENRE_LIMIT = 24;

async function fetchFromHost(host: string, genre: Genre): Promise<FormattedStation[]> {
    const query = new URLSearchParams({
        // Let the server drop the dead ones so we never even see them.
        hidebroken: 'true',
        order: 'clickcount',
        reverse: 'true',
        limit: String(STATIONS_PER_GENRE)
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const url = `${host}/json/stations/bytag/${encodeURIComponent(genre)}?${query}`;
        const response = await fetch(url, {cache: 'no-store', signal: controller.signal});
        if (!response.ok) throw new Error(`${host} responded ${response.status}`);

        const stations = await response.json() as Station[];
        return formatStations(stations, genre);
    } finally {
        clearTimeout(timeout);
        controller.abort();
    }
}

/**
 * Stations for one genre. An empty list means the genre exists but has nothing
 * playable; a throw means no mirror could be reached at all.
 */
export async function fetchGenre(genre: Genre): Promise<FormattedStation[]> {
    let lastError: unknown = new Error('No radio-browser mirror could be reached');

    for (const host of API_HOSTS) {
        try {
            const stations = await fetchFromHost(host, genre);
            writeCache(genre, stations);
            return stations;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError;
}

interface CachePayload {
    savedAt: number;
    stations: FormattedStation[];
}

const cacheKey = (genre: Genre) => `${CACHE_PREFIX}${genre}`;

function evictOldest() {
    try {
        const keys: Array<{key: string; savedAt: number}> = [];
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (!key?.startsWith(CACHE_PREFIX)) continue;
            const raw = localStorage.getItem(key);
            const savedAt = raw ? (JSON.parse(raw) as CachePayload).savedAt ?? 0 : 0;
            keys.push({key, savedAt});
        }
        if (keys.length < CACHED_GENRE_LIMIT) return;

        keys.sort((a, b) => a.savedAt - b.savedAt);
        for (const {key} of keys.slice(0, keys.length - CACHED_GENRE_LIMIT + 1)) {
            localStorage.removeItem(key);
        }
    } catch {
        // Cache housekeeping is best-effort.
    }
}

function writeCache(genre: Genre, stations: FormattedStation[]) {
    try {
        evictOldest();
        const payload: CachePayload = {savedAt: Date.now(), stations};
        localStorage.setItem(cacheKey(genre), JSON.stringify(payload));
    } catch {
        // Quota or private mode - the cache is an optimisation, not a requirement.
    }
}

export interface CachedStations {
    stations: FormattedStation[];
    fresh: boolean;
}

export function loadCachedGenre(genre: Genre): CachedStations | null {
    try {
        const raw = localStorage.getItem(cacheKey(genre));
        if (!raw) return null;

        const payload = JSON.parse(raw) as CachePayload;
        if (!Array.isArray(payload?.stations) || payload.stations.length === 0) return null;

        return {
            stations: payload.stations,
            fresh: Date.now() - payload.savedAt < CACHE_TTL_MS
        };
    } catch {
        return null;
    }
}

/**
 * Drops every cached genre, so the next load genuinely goes to the network.
 *
 * Matches on the family rather than the current prefix: entries written by an
 * older cache format are never read and never expire, so a reset is the one
 * chance to be rid of them.
 */
export function clearStationCache() {
    try {
        const keys: string[] = [];
        for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (key?.startsWith(CACHE_FAMILY)) keys.push(key);
        }
        // Collected first: removing while iterating shifts the indices.
        for (const key of keys) localStorage.removeItem(key);
    } catch {
        // Private mode - there was nothing cached to clear anyway.
    }
}
