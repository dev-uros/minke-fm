import {FormattedStation, Genre} from "../types";

/**
 * The cached station lists, in IndexedDB rather than localStorage.
 *
 * A genre is no longer the top couple of hundred stations but everything the
 * directory has under that tag - measured at 4448 stations for "rock" once
 * duplicates are gone, about a megabyte each. localStorage gives roughly five
 * megabytes per origin in total, so a handful of genres would have filled it and
 * every write after that would have thrown. IndexedDB has no such ceiling worth
 * worrying about, and it stores the array by structured clone, so there is no
 * JSON round trip either.
 */

const DB_NAME = 'minke-fm';
const DB_VERSION = 1;
const STORE = 'genres';
const SAVED_AT_INDEX = 'savedAt';

/** Old genres are evicted so a session of browsing cannot grow without bound. */
const CACHED_GENRE_LIMIT = 24;

/** localStorage keys written by the version of this cache that lived there. */
const LEGACY_PREFIX = 'minke-fm:stations';

interface CacheEntry {
    savedAt: number;
    stations: FormattedStation[];
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE)) {
                const store = db.createObjectStore(STORE);
                // Lets eviction find the oldest without reading a megabyte of
                // stations for every genre just to compare timestamps.
                store.createIndex(SAVED_AT_INDEX, 'savedAt');
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        // Private browsing, or another tab holding an older version open.
        request.onblocked = () => reject(new Error('IndexedDB blocked'));
    });

    // A failed open must not be remembered, or the cache stays broken for the
    // rest of the session over what may have been a transient error.
    dbPromise.catch(() => {
        dbPromise = null;
    });

    return dbPromise;
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/** Sweeps the entries the previous localStorage-backed cache left behind. */
function dropLegacyCache() {
    try {
        const keys: string[] = [];
        for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (key?.startsWith(LEGACY_PREFIX)) keys.push(key);
        }
        // Collected first: removing while iterating shifts the indices.
        for (const key of keys) localStorage.removeItem(key);
    } catch {
        // Private mode - there was nothing cached to clear anyway.
    }
}

let sweptLegacy = false;

async function evictOldest(store: IDBObjectStore) {
    const total = await promisify(store.count());
    let excess = total - CACHED_GENRE_LIMIT + 1;
    if (excess <= 0) return;

    await new Promise<void>((resolve, reject) => {
        // Ascending on savedAt, so the cursor walks oldest first.
        const request = store.index(SAVED_AT_INDEX).openKeyCursor();
        request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor || excess <= 0) {
                resolve();
                return;
            }
            store.delete(cursor.primaryKey);
            excess -= 1;
            cursor.continue();
        };
        request.onerror = () => reject(request.error);
    });
}

export async function writeGenre(genre: Genre, stations: FormattedStation[]) {
    if (!sweptLegacy) {
        sweptLegacy = true;
        dropLegacyCache();
    }

    try {
        const db = await openDb();
        const transaction = db.transaction(STORE, 'readwrite');
        const store = transaction.objectStore(STORE);

        await evictOldest(store);
        const entry: CacheEntry = {savedAt: Date.now(), stations};
        store.put(entry, genre);

        await new Promise<void>((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    } catch {
        // The cache is an optimisation, not a requirement.
    }
}

export async function readGenre(genre: Genre): Promise<CacheEntry | null> {
    try {
        const db = await openDb();
        const store = db.transaction(STORE, 'readonly').objectStore(STORE);
        const entry = await promisify(store.get(genre) as IDBRequest<CacheEntry | undefined>);

        if (!entry || !Array.isArray(entry.stations) || entry.stations.length === 0) {
            return null;
        }
        return entry;
    } catch {
        return null;
    }
}

export async function clearGenres() {
    dropLegacyCache();
    try {
        const db = await openDb();
        const transaction = db.transaction(STORE, 'readwrite');
        transaction.objectStore(STORE).clear();
        await new Promise<void>(resolve => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => resolve();
            transaction.onabort = () => resolve();
        });
    } catch {
        // Nothing cached to clear.
    }
}
