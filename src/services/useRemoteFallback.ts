import type {FormattedStation, Genre} from "../types";

/**
 * A fresher copy of the bundled stand-in stations (src/assets/fallback-stations.json).
 *
 * GitHub Actions rebuilds that list every week and the site publishes it, so the app
 * fetches it once a week while open and online, and keeps it on the device. The copy
 * shipped in the app stays as the last resort: first launch, no connection.
 *
 * The list comes from our own site (Cloudflare), not radio-browser, on purpose: it is
 * what plays when radio-browser is down, so it must not depend on radio-browser.
 */

export const REMOTE_FALLBACK_URL = 'https://minkefm.fifthguild.com/stations.json';

type FallbackStation = Pick<FormattedStation, 'name' | 'id' | 'url' | 'country' | 'state'>;
export type FallbackList = Record<Genre, FallbackStation[]>;

const DB_NAME = 'minke-fm-fallback';
const STORE = 'lists';
const KEY = 'stations';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20_000;

interface Saved {
    savedAt: number;
    list: FallbackList;
}

/** Its own small database, so the station cache's schema and eviction never touch it. */
function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function readSaved(): Promise<Saved | null> {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
            request.onsuccess = () => resolve((request.result as Saved | undefined) ?? null);
            request.onerror = () => reject(request.error);
        });
    } catch {
        return null;
    }
}

async function writeSaved(saved: Saved) {
    try {
        const db = await openDb();
        db.transaction(STORE, 'readwrite').objectStore(STORE).put(saved, KEY);
    } catch {
        // Private mode or no IndexedDB: the bundled list still works.
    }
}

/**
 * Accepts only what looks like the list: genres mapped to stations that each have a
 * name, an id and an http(s) URL. A broken or hijacked response never replaces it.
 */
export function isFallbackList(value: unknown): value is FallbackList {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const lists = Object.values(value as Record<string, unknown>);
    if (lists.length < 50) return false;
    return lists.every(list => Array.isArray(list) && list.every(station =>
        station && typeof station === 'object'
        && typeof (station as FallbackStation).name === 'string'
        && typeof (station as FallbackStation).id === 'string'
        && /^https?:\/\//i.test(String((station as FallbackStation).url))));
}

/** The downloaded list, if one has been saved. */
export async function savedFallback(): Promise<FallbackList | null> {
    return (await readSaved())?.list ?? null;
}

/**
 * Fetches the list when the saved one is a week old, or there is none. Quiet on
 * failure: it tries again the next time the app is opened.
 */
export async function refreshFallback(now = Date.now()): Promise<boolean> {
    const saved = await readSaved();
    if (saved && now - saved.savedAt < WEEK_MS) return false;

    // Not AbortSignal.timeout: the iPhone app supports iOS 15, whose WebKit lacks it.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const response = await fetch(REMOTE_FALLBACK_URL, {cache: 'no-store', signal: controller.signal});
        if (!response.ok) return false;
        const list: unknown = await response.json();
        if (!isFallbackList(list)) return false;
        await writeSaved({savedAt: now, list});
        return true;
    } catch {
        return false;
    } finally {
        clearTimeout(timeout);
    }
}
