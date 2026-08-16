import {FormattedStation, Genre, Station} from "../types";
import {formatStations} from "./useStationFormat.ts";
import {clearGenres, readGenre, writeGenre} from "./useStationCache.ts";

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

/**
 * Generous, because a genre is now the whole tag rather than a page of it:
 * "rock" is about six megabytes, and the mirrors do not compress it.
 */
const REQUEST_TIMEOUT_MS = 45_000;

/** Higher than any tag's station count, which is how you ask for all of them. */
const NO_LIMIT = 100_000;

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

async function fetchFromHost(host: string, genre: Genre): Promise<FormattedStation[]> {
    /*
     * No limit: every station under the tag, most-played first.
     *
     * It used to take the top 200, which quietly put a floor on how obscure a
     * station could be and still be reachable - twelve clicks, in the case of
     * "rock". Sampling proved that floor was not buying quality either: of
     * twenty-five stations with zero clicks, twenty-five answered, against
     * twenty-four of twenty-five from the top of the list. Clicks measure fame,
     * not whether a station works.
     */
    const query = new URLSearchParams({
        // Let the server drop the dead ones so we never even see them.
        hidebroken: 'true',
        order: 'clickcount',
        reverse: 'true',
        // Omitting this does not mean "everything" - radio-browser then applies
        // its own default of 1000, which silently capped "rock" at 908 stations
        // after de-duplication. The ceiling has to be asked for explicitly.
        limit: String(NO_LIMIT)
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
            // Not awaited: a megabyte of stations should not hold up playback.
            void writeGenre(genre, stations);
            return stations;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError;
}

export interface CachedStations {
    stations: FormattedStation[];
    fresh: boolean;
}

export async function loadCachedGenre(genre: Genre): Promise<CachedStations | null> {
    const entry = await readGenre(genre);
    if (!entry) return null;

    return {
        stations: entry.stations,
        fresh: Date.now() - entry.savedAt < CACHE_TTL_MS
    };
}

/**
 * Drops every cached genre, so the next load genuinely goes to the network.
 *
 * Also sweeps the localStorage entries the previous cache format left behind:
 * they are never read and never expire, so a reset is the one chance to be rid
 * of them.
 */
export async function clearStationCache() {
    await clearGenres();
}
