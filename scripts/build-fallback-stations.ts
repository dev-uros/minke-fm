/**
 * Writes src/assets/fallback-stations.json: the top stations of every catalogue
 * genre that were actually streaming when this ran.
 *
 * The app ships that file so a genre still has something to play when
 * radio-browser is down and the genre was never cached - which happened on
 * 2026-10-30, when every mirror answered 503 for hours and only lofi, the one
 * cached genre, had any stations at all.
 *
 *     npm run fallback:stations
 *
 * Re-run it now and then: stations move and die, and the file is a snapshot.
 */

import {writeFile} from "node:fs/promises";
import {GENRE_CATALOGUE} from "../src/services/useGenres.ts";
import {formatStations} from "../src/services/useStationFormat.ts";
import type {FormattedStation, Station} from "../src/types/index.ts";

const OUT = new URL('../src/assets/fallback-stations.json', import.meta.url);
const HOSTS = ['https://de1.api.radio-browser.info', 'https://de2.api.radio-browser.info'];

const PER_GENRE = 20;
/** Candidates fetched per genre: dedupe and dead streams eat into the first 20. */
const CANDIDATES = 80;
const PROBE_TIMEOUT_MS = 8_000;
const PROBE_CONCURRENCY = 32;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** The directory drops requests in bursts, so a failure is retried, not believed. */
async function fetchTop(genre: string): Promise<Station[]> {
    const query = new URLSearchParams({
        hidebroken: 'true',
        order: 'clickcount',
        reverse: 'true',
        limit: String(CANDIDATES)
    });

    let lastError: unknown;
    for (let attempt = 0; attempt < 8; attempt++) {
        const host = HOSTS[attempt % HOSTS.length];
        try {
            const response = await fetch(
                `${host}/json/stations/bytag/${encodeURIComponent(genre)}?${query}`,
                {signal: AbortSignal.timeout(30_000)}
            );
            if (!response.ok) throw new Error(`${host} responded ${response.status}`);
            return await response.json() as Station[];
        } catch (error) {
            lastError = error;
            await sleep(1_000 * (attempt + 1));
        }
    }
    throw lastError;
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
    let done = 0;

    // Genres one after another, probes in parallel within each: the directory
    // is the fragile part, the stream hosts are thousands of separate servers.
    for (const {name: genre} of GENRE_CATALOGUE) {
        let candidates: FormattedStation[];
        try {
            candidates = formatStations(await fetchTop(genre), genre);
        } catch (error) {
            console.error(`✗ ${genre}: directory unreachable (${error})`);
            process.exitCode = 1;
            continue;
        }

        const alive = await pool(candidates, PROBE_CONCURRENCY, station => isStreaming(station.url));
        out[genre] = candidates
            .filter((_, index) => alive[index])
            .slice(0, PER_GENRE)
            .map(({name, id, url, country, state}) => ({name, id, url, country, state}));

        done++;
        console.log(`${String(done).padStart(3)}/${GENRE_CATALOGUE.length} ${genre}: ` +
            `${out[genre].length} of ${candidates.length} candidates`);
    }

    await writeFile(OUT, JSON.stringify(out) + '\n');
    const total = Object.values(out).reduce((sum, list) => sum + list.length, 0);
    console.log(`Wrote ${total} stations for ${Object.keys(out).length} genres.`);
}

await main();
