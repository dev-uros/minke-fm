import {ref, type Ref} from "vue";
import type {Genre} from "../types";

/**
 * Radio by country. A country is tuned into the same way a genre is: it is a "genre"
 * whose key is `country:<iso code>`, so the station cache, the bundled fallback,
 * next/previous and favourites all work for it unchanged. Only the fetch
 * (useStationsApi.ts) and the label shown on the deck (genreLabel) know the difference.
 */

export const COUNTRY_PREFIX = 'country:';

export const isCountryGenre = (genre: Genre) => genre.startsWith(COUNTRY_PREFIX);

/** Upper case, as radio-browser and Intl want it. */
export const countryCodeOf = (genre: Genre) => genre.slice(COUNTRY_PREFIX.length).toUpperCase();

export const countryGenre = (code: string): Genre => `${COUNTRY_PREFIX}${code.toLowerCase()}`;

/** Where the system's name is not the one people look for. */
const NAMES: Record<string, string> = {
    CN: 'China',
    HK: 'Hong Kong',
    MO: 'Macao',
    PS: 'Palestine',
};

let regionNames: Intl.DisplayNames | null | undefined;

/** "RS" -> "Serbia", from the system's own list; the code itself where there is none. */
export function countryName(code: string): string {
    if (NAMES[code.toUpperCase()]) return NAMES[code.toUpperCase()];
    if (regionNames === undefined) {
        try {
            regionNames = new Intl.DisplayNames(['en'], {type: 'region'});
        } catch {
            regionNames = null;
        }
    }
    try {
        return regionNames?.of(code.toUpperCase()) ?? code.toUpperCase();
    } catch {
        return code.toUpperCase();
    }
}

export interface CountryOption {
    code: string;
    name: string;
    stationCount: number;
}

const COUNTRIES_PATH = '/json/countrycodes?hidebroken=true';
const API_HOSTS = ['https://de1.api.radio-browser.info', 'https://de2.api.radio-browser.info'];
const REQUEST_TIMEOUT_MS = 10_000;
const CACHE_KEY = 'minke-fm:country-counts:v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** Fewer than this and a country is mostly dead links and test entries. */
const MIN_STATIONS = 3;
/** Spinning the globe only lands where there is enough to listen to. */
const SPIN_MIN_STATIONS = 15;

interface CountryCount {
    name: string;
    stationcount: number;
}

const readCache = (): CountryCount[] | null => {
    try {
        const payload = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as {savedAt: number, counts: CountryCount[]} | null;
        if (!payload?.counts || Date.now() - payload.savedAt > CACHE_TTL_MS) return null;
        return payload.counts;
    } catch {
        return null;
    }
};

const writeCache = (counts: CountryCount[]) => {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({savedAt: Date.now(), counts}));
    } catch {
        // Quota or private mode: the list is fetched again next time.
    }
};

async function fetchCounts(): Promise<CountryCount[] | null> {
    for (const host of API_HOSTS) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await fetch(`${host}${COUNTRIES_PATH}`, {cache: 'no-store', signal: controller.signal});
            if (response.ok) return await response.json() as CountryCount[];
        } catch {
            // The next mirror.
        } finally {
            clearTimeout(timeout);
        }
    }
    return null;
}

const toOptions = (counts: CountryCount[]): CountryOption[] =>
    counts
        .filter(entry => /^[A-Z]{2}$/.test(entry.name) && entry.stationcount >= MIN_STATIONS)
        .map(entry => ({
            code: entry.name,
            name: countryName(entry.name),
            stationCount: entry.stationcount
        }))
        // A code the system has no name for is not a country anyone is looking for.
        .filter(option => option.name !== option.code)
        .sort((a, b) => b.stationCount - a.stationCount);

export function useCountries() {
    const countries: Ref<CountryOption[]> = ref([]);
    const loading = ref(false);
    const failed = ref(false);

    const loadCountries = async () => {
        const cached = readCache();
        if (cached) {
            countries.value = toOptions(cached);
            return;
        }
        loading.value = true;
        failed.value = false;
        const counts = await fetchCounts();
        loading.value = false;
        if (!counts) {
            failed.value = true;
            return;
        }
        writeCache(counts);
        countries.value = toOptions(counts);
    };

    /** A country picked at random, never the one already playing. */
    const spin = (current: Genre): CountryOption | null => {
        const pool = countries.value.filter(option =>
            option.stationCount >= SPIN_MIN_STATIONS && countryGenre(option.code) !== current);
        return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    };

    return {countries, loading, failed, loadCountries, spin};
}
