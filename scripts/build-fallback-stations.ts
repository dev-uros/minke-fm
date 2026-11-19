/**
 * Writes src/assets/fallback-stations.json: the top stations of every catalogue
 * genre, and of every country, that were actually streaming when this ran.
 * Countries are keyed `country:<iso>`, as the app keys them (useCountries.ts).
 *
 * The app ships that file so a genre still has something to play when
 * radio-browser is down and the genre was never cached - which happened on
 * 2026-10-30, when every mirror answered 503 for hours and only lofi, the one
 * cached genre, had any stations at all.
 *
 *     npm run fallback:stations
 *
 * GitHub Actions runs it every week (.github/workflows/fallback-stations.yml) and
 * commits the result; the site publishes it at /stations.json, and the app fetches
 * that weekly (useRemoteFallback.ts). Running it by hand still works.
 */

import {readFile, writeFile} from "node:fs/promises";
import {GENRE_CATALOGUE} from "../src/services/useGenres.ts";
import {formatStations} from "../src/services/useStationFormat.ts";
import type {FormattedStation, Station} from "../src/types/index.ts";

const OUT = new URL('../src/assets/fallback-stations.json', import.meta.url);
const HOSTS = ['https://de1.api.radio-browser.info', 'https://de2.api.radio-browser.info'];

const PER_GENRE = 20;
/** Candidates fetched per genre: dedupe and dead streams eat into the first 20. */
const CANDIDATES = 80;
/** A country is a smaller stand-in: enough to play something, not to browse. */
const PER_COUNTRY = 10;
const COUNTRY_CANDIDATES = 30;
/** As in the app's country picker: fewer than this is mostly test entries. */
const MIN_COUNTRY_STATIONS = 3;
const PROBE_TIMEOUT_MS = 8_000;
const PROBE_CONCURRENCY = 32;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** The directory drops requests in bursts, so a failure is retried, not believed. */
async function fromDirectory<T>(path: string): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 8; attempt++) {
        const host = HOSTS[attempt % HOSTS.length];
        try {
            const response = await fetch(`${host}${path}`, {signal: AbortSignal.timeout(30_000)});
            if (!response.ok) throw new Error(`${host} responded ${response.status}`);
            return await response.json() as T;
        } catch (error) {
            lastError = error;
            await sleep(1_000 * (attempt + 1));
        }
    }
    throw lastError;
}

/** The most listened stations under a tag, or broadcasting from a country (`country:rs`). */
function fetchTop(key: string, limit: number): Promise<Station[]> {
    const query = new URLSearchParams({hidebroken: 'true', order: 'clickcount', reverse: 'true', limit: String(limit)});
    const list = key.startsWith('country:')
        ? `bycountrycodeexact/${encodeURIComponent(key.slice('country:'.length).toUpperCase())}`
        : `bytag/${encodeURIComponent(key)}`;
    return fromDirectory<Station[]>(`/json/stations/${list}?${query}`);
}

/** Every country with enough stations, as the app's keys. */
async function countryKeys(): Promise<string[]> {
    const counts = await fromDirectory<{name: string, stationcount: number}[]>('/json/countrycodes?hidebroken=true');
    return counts
        .filter(c => /^[A-Z]{2}$/.test(c.name) && c.stationcount >= MIN_COUNTRY_STATIONS)
        .sort((a, b) => b.stationcount - a.stationcount)
        .map(c => `country:${c.name.toLowerCase()}`);
}

/**
 * Does the stream answer with audio? Only the first bytes are read: a 200 with
 * an HTML error page is common enough that the status alone proves nothing.
 */
async function isStreaming(url: string): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
        const response = await fetch(url, {signal: controller.signal, headers: {'Icy-MetaData': '0'}});
        if (!response.ok || !response.body) return false;

        const type = (response.headers.get('content-type') ?? '').toLowerCase();
        if (type.includes('text/html')) return false;
        const audio = /audio|ogg|mpegurl|octet-stream|aac|mpeg/.test(type);

        const reader = response.body.getReader();
        const {value} = await reader.read();
        await reader.cancel();
        return audio && !!value && value.length > 0;
    } catch {
        return false;
    } finally {
        clearTimeout(timeout);
        controller.abort();
    }
}

/** Runs `task` over `items` with at most `limit` in flight. */
async function pool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    const workers = Array.from({length: Math.min(limit, items.length)}, async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await task(items[index]);
        }
    });
    await Promise.all(workers);
    return results;
}

type FallbackStation = Pick<FormattedStation, 'name' | 'id' | 'url' | 'country' | 'state'>;

async function main() {
    const out: Record<string, FallbackStation[]> = {};
    // The last run's lists: a key the directory drops this time keeps what it had,
    // rather than vanishing from the app until next week.
    const previous: Record<string, FallbackStation[]> =
        JSON.parse(await readFile(OUT, 'utf8').catch(() => '{}'));

    let countries: string[] = [];
    try {
        countries = await countryKeys();
    } catch (error) {
        console.error(`✗ country list: directory unreachable, keeping last week's countries (${error})`);
        countries = Object.keys(previous).filter(key => key.startsWith('country:'));
    }

    const lists = [
        ...GENRE_CATALOGUE.map(({name}) => ({key: name, keep: PER_GENRE, candidates: CANDIDATES})),
        ...countries.map(key => ({key, keep: PER_COUNTRY, candidates: COUNTRY_CANDIDATES})),
    ];
    let done = 0;

    // Lists one after another, probes in parallel within each: the directory
    // is the fragile part, the stream hosts are thousands of separate servers.
    for (const {key, keep, candidates: limit} of lists) {
        let candidates: FormattedStation[];
        try {
            candidates = formatStations(await fetchTop(key, limit), key);
        } catch (error) {
            console.error(`✗ ${key}: directory unreachable, keeping last week's list (${error})`);
            if (previous[key]) out[key] = previous[key];
            continue;
        }

        const alive = await pool(candidates, PROBE_CONCURRENCY, station => isStreaming(station.url));
        const kept = candidates
            .filter((_, index) => alive[index])
            .slice(0, keep)
            .map(({name, id, url, country, state}) => ({name, id, url, country, state}));
        // A list that came back empty is left out, so the app falls through to
        // favourites and the directory rather than to nothing.
        if (kept.length) out[key] = kept;

        done++;
        console.log(`${String(done).padStart(3)}/${lists.length} ${key}: ${kept.length} of ${candidates.length} candidates`);
    }

    // A run that lost the directory for good part way, with no older list to fall
    // back on, would ship a thin file: better to keep the old one and fail the job.
    const genres = Object.keys(out).filter(key => !key.startsWith('country:')).length;
    if (genres < GENRE_CATALOGUE.length * 0.9) {
        console.error(`✗ only ${genres} of ${GENRE_CATALOGUE.length} genres came back; not writing.`);
        process.exit(1);
    }

    await writeFile(OUT, JSON.stringify(out) + '\n');
    const total = Object.values(out).reduce((sum, list) => sum + list.length, 0);
    console.log(`Wrote ${total} stations for ${genres} genres and ${Object.keys(out).length - genres} countries.`);
}

await main();
