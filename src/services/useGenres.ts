import {ref, Ref} from "vue";
import {Genre, GenreOption} from "../types";

/**
 * The browsable genre catalogue.
 *
 * radio-browser's own tag list cannot be used directly: sorted by popularity it
 * is mostly not genres at all - "news", "radio", "fm", "méxico", "entretenimiento",
 * "full service", "moi merino" - and filtering that by rule drops real genres
 * ("80s", "regional mexican") while still letting junk through. So the catalogue
 * below is curated, and the directory is asked only for the station counts.
 *
 * This is not a limit on what can be played. Any tag typed into the search is
 * tuned into directly, so a genre missing here is still one keystroke away.
 */

const CATALOGUE: Array<[family: string, genres: string[]]> = [
    ['Chill', [
        'lofi', 'lofi hip hop', 'chillhop', 'jazzhop', 'chillout', 'chill', 'downtempo',
        'ambient', 'ambient lounge', 'lounge', 'easy listening', 'new age', 'meditation',
        'relaxation', 'sleep', 'study', 'nature'
    ]],
    ['Synth', [
        'synthwave', 'retrowave', 'vaporwave', 'chillwave', 'darkwave', 'outrun',
        'cyberpunk', 'synthpop', 'chiptune'
    ]],
    ['Electronic', [
        'electronic', 'electronica', 'edm', 'house', 'deep house', 'tech house',
        'progressive house', 'techno', 'ambient techno', 'trance', 'psytrance',
        'drum and bass', 'dubstep', 'breakbeat', 'jungle', 'garage', 'idm', 'minimal',
        'acid', 'hardstyle', 'eurodance', 'dance', 'dance pop', 'disco'
    ]],
    ['Rock', [
        'rock', 'classic rock', 'alternative', 'alternative rock', 'indie', 'indie rock',
        'hard rock', 'soft rock', 'pop rock', 'punk', 'punk rock', 'post punk', 'grunge',
        'psychedelic rock', 'progressive rock', 'garage rock', 'southern rock',
        'rock and roll', 'shoegaze', 'post rock', 'emo', 'hardcore', 'experimental',
        'noise', 'industrial'
    ]],
    ['Metal', [
        'metal', 'heavy metal', 'death metal', 'black metal', 'doom metal', 'power metal',
        'thrash metal', 'metalcore', 'nu metal', 'folk metal', 'symphonic metal',
        'gothic metal'
    ]],
    ['Jazz & Blues', [
        'jazz', 'smooth jazz', 'vocal jazz', 'jazz funk', 'acid jazz', 'bebop', 'swing',
        'big band', 'fusion', 'blues', 'chicago blues', 'rhythm and blues', 'soul',
        'funk', 'motown'
    ]],
    ['Hip-Hop', [
        'hip hop', 'rap', 'trap', 'old school', 'boom bap', 'grime', 'drill'
    ]],
    ['Pop', [
        'pop', 'indie pop', 'teen pop', 'power pop', 'k-pop', 'j-pop', 'anime'
    ]],
    ['Country & Folk', [
        'country', 'bluegrass', 'americana', 'folk', 'singer-songwriter', 'acoustic',
        'celtic'
    ]],
    ['Classical', [
        'classical', 'opera', 'baroque', 'orchestral', 'symphonic', 'choral',
        'chamber music', 'contemporary classical', 'piano'
    ]],
    ['Reggae', [
        'reggae', 'roots reggae', 'dub', 'ska', 'dancehall'
    ]],
    ['Latin', [
        'latin pop', 'latin salsa', 'bachata', 'merengue', 'cumbia', 'reggaeton', 'tango',
        'bossa nova', 'samba', 'flamenco'
    ]],
    ['World', [
        'world music', 'afrobeat', 'afrobeats', 'highlife', 'arabic', 'indian', 'bollywood',
        'greek', 'balkan', 'gypsy'
    ]],
    ['Screen', [
        'soundtrack', 'film music', 'video game music'
    ]],
    ['Spiritual', [
        'gospel', 'christian rock', 'worship', 'spiritual'
    ]],
    ['Eras', [
        'oldies', '60s', '70s', '80s', '90s', '2000s', 'retro', 'classic hits'
    ]]
];

/** Tags are lowercase; these read better with their own capitalisation. */
const LABELS: Record<string, string> = {
    'lofi': 'LoFi',
    'lofi hip hop': 'LoFi Hip Hop',
    'chillhop': 'ChillHop',
    'jazzhop': 'JazzHop',
    'synthwave': 'SynthWave',
    'retrowave': 'RetroWave',
    'vaporwave': 'VaporWave',
    'chillwave': 'ChillWave',
    'darkwave': 'DarkWave',
    'edm': 'EDM',
    'idm': 'IDM',
    'k-pop': 'K-Pop',
    'j-pop': 'J-Pop',
    'r&b': 'R&B',
    'rhythm and blues': 'Rhythm & Blues',
    'drum and bass': 'Drum & Bass'
};

const label = (name: string) =>
    LABELS[name] ?? name.replace(/\b[a-z]/g, letter => letter.toUpperCase());

export const GENRE_CATALOGUE: GenreOption[] = CATALOGUE.flatMap(([family, genres]) =>
    genres.map(name => ({name, label: label(name), family}))
);

export const DEFAULT_GENRE: Genre = 'lofi';

const TAGS_URL =
    'https://de1.api.radio-browser.info/json/tags?order=stationcount&reverse=true&limit=4000&hidebroken=true';
const REQUEST_TIMEOUT_MS = 10_000;
const COUNTS_CACHE_KEY = 'minke-fm:tag-counts:v1';
const COUNTS_TTL_MS = 24 * 60 * 60 * 1000;

interface TagCount {
    name: string;
    stationcount: number;
}

interface CachedCounts {
    savedAt: number;
    counts: Record<string, number>;
}

function readCache(): Record<string, number> | null {
    try {
        const raw = localStorage.getItem(COUNTS_CACHE_KEY);
        if (!raw) return null;
        const payload = JSON.parse(raw) as CachedCounts;
        if (!payload?.counts) return null;
        if (Date.now() - payload.savedAt > COUNTS_TTL_MS) return null;
        return payload.counts;
    } catch {
        return null;
    }
}

function writeCache(counts: Record<string, number>) {
    try {
        localStorage.setItem(
            COUNTS_CACHE_KEY,
            JSON.stringify({savedAt: Date.now(), counts} satisfies CachedCounts)
        );
    } catch {
        // Quota or private mode - counts are decoration, not a requirement.
    }
}

export function useGenres() {
    const genres: Ref<GenreOption[]> = ref([...GENRE_CATALOGUE]);

    const applyCounts = (counts: Record<string, number>) => {
        genres.value = GENRE_CATALOGUE
            .map(option => ({...option, stationCount: counts[option.name]}))
            // A genre the directory has never heard of is not worth offering,
            // but one it simply did not index stays - the count is only a hint.
            .sort((a, b) => (b.stationCount ?? 0) - (a.stationCount ?? 0));
    };

    /** Station counts, so the picker can lead with genres that have content. */
    const loadCounts = async () => {
        const cached = readCache();
        if (cached) {
            applyCounts(cached);
            return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await fetch(TAGS_URL, {cache: 'no-store', signal: controller.signal});
            if (!response.ok) return;

            const tags = await response.json() as TagCount[];
            const counts: Record<string, number> = {};
            for (const tag of tags) {
                counts[tag.name.toLowerCase()] = tag.stationcount;
            }
            writeCache(counts);
            applyCounts(counts);
        } catch {
            // Without counts the catalogue still works, just unsorted.
        } finally {
            clearTimeout(timeout);
            controller.abort();
        }
    };

    return {genres, loadCounts};
}

/** Anything the user types is a valid tag; this only tidies it. */
export function normalizeGenreInput(value: string): Genre {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
