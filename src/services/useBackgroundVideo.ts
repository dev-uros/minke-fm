import {ref} from "vue";
import {convertFileSrc, invoke} from "@tauri-apps/api/core";
import {Genre} from "../types";
import {getRandomLofiVideoNoRepeat} from "./useLofiVideo.ts";
import {getRandomSynthwaveVideoNoRepeat} from "./useSynthwaveVideo.ts";
import {getRandomRockVideoNoRepeat} from "./useRockVideo.ts";

/**
 * Picks a backdrop for a genre.
 *
 * Footage is fetched from Pexels and cached on disk, since there are thousands
 * of playable genres and only three sets of bundled clips.
 *
 * The genre name itself is a poor search term - "jazzhop" and "polka" return
 * nothing, and a generic term like "concert crowd" returns footage of people
 * applauding. So genres map onto *scenes*, and each scene carries several
 * music-flavoured search terms: one term alone returns the same handful of
 * clips however many pages are requested.
 */

interface Scene {
    id: string;
    queries: string[];
}

const SCENES: Record<string, Scene> = {
    lofi: {
        id: 'lofi',
        queries: [
            'rain on window night city',
            'cozy room warm lamp night',
            'night city bokeh lights window',
            'coffee desk study night lamp'
        ]
    },
    ambient: {
        id: 'ambient',
        queries: [
            'slow clouds timelapse sky',
            'calm ocean surface sunrise',
            'northern lights night sky',
            'fog forest morning drone'
        ]
    },
    synthwave: {
        id: 'synthwave',
        queries: [
            'neon lights night city rain',
            'retro neon sign glowing',
            'night drive city lights windshield',
            'purple pink neon abstract'
        ]
    },
    rock: {
        id: 'rock',
        queries: [
            'rock concert stage lights',
            'electric guitar player close up',
            'stage smoke spotlights concert',
            'guitarist playing live music'
        ]
    },
    metal: {
        id: 'metal',
        queries: [
            'dark concert stage smoke lights',
            'heavy metal concert crowd dark',
            'electric guitar dark moody',
            'red stage lights silhouette'
        ]
    },
    electronic: {
        id: 'electronic',
        queries: [
            'dj mixing turntable club',
            'nightclub laser lights crowd',
            'dj booth night club lights',
            'audio equalizer lights abstract'
        ]
    },
    jazz: {
        id: 'jazz',
        queries: [
            'saxophone player jazz club',
            'jazz band playing dim light',
            'double bass player close up',
            'trumpet player close up'
        ]
    },
    blues: {
        id: 'blues',
        queries: [
            'blues guitar player bar',
            'neon bar sign night rain',
            'vintage microphone stage light',
            'smoky bar dim lights'
        ]
    },
    classical: {
        id: 'classical',
        queries: [
            'orchestra playing concert hall',
            'piano keys playing close up',
            'violin player close up',
            'concert hall empty seats'
        ]
    },
    hiphop: {
        id: 'hiphop',
        queries: [
            'turntable vinyl scratching dj',
            'graffiti wall street art',
            'city street night neon walk',
            'microphone studio recording'
        ]
    },
    pop: {
        id: 'pop',
        queries: [
            'concert stage lights performance',
            'crowd hands concert night',
            'colourful stage lights show',
            'singer microphone stage'
        ]
    },
    country: {
        id: 'country',
        queries: [
            'acoustic guitar campfire night',
            'desert highway road sunset drive',
            'countryside field golden hour',
            'barn field sunset'
        ]
    },
    folk: {
        id: 'folk',
        queries: [
            'acoustic guitar playing close up',
            'campfire night forest',
            'forest path morning light',
            'hands playing banjo'
        ]
    },
    reggae: {
        id: 'reggae',
        queries: [
            'beach palm trees sunset',
            'tropical ocean waves slow',
            'jamaica beach sunny',
            'palm leaves sunlight'
        ]
    },
    latin: {
        id: 'latin',
        queries: [
            'couple dancing salsa night',
            'tropical city street sunset',
            'dancing feet close up',
            'carnival lights night'
        ]
    },
    world: {
        id: 'world',
        queries: [
            'traditional drums playing hands',
            'market street colourful',
            'traditional dance performance',
            'desert dunes sunset'
        ]
    },
    gospel: {
        id: 'gospel',
        queries: [
            'church stained glass light',
            'choir singing performance',
            'sunlight through window dust',
            'candles glowing dark'
        ]
    },
    screen: {
        id: 'screen',
        queries: [
            'cinematic clouds aerial drone',
            'film projector light dark',
            'cinema screen dark theatre',
            'retro arcade machine lights'
        ]
    },
    eras: {
        id: 'eras',
        queries: [
            'vinyl record player spinning',
            'retro tv static old',
            'vintage cassette tape close up',
            'old film grain city street'
        ]
    }
};

/**
 * Genre to scene, first match wins - so order matters twice over.
 *
 * Specific families come first and vague modifiers last: "rock experimental"
 * has to land on rock, while a bare "experimental" belongs with the abstract
 * footage. Likewise "minimal techno" is electronic, but "minimal" alone is not.
 */
const RULES: Array<[scene: string, words: string[]]> = [
    ['lofi', ['lofi', 'lo-fi', 'chillhop', 'jazzhop', 'chillout', 'chill', 'downtempo', 'study', 'sleep', 'relax', 'relaxation', 'meditation', 'lounge', 'easy listening']],
    ['synthwave', ['synthwave', 'retrowave', 'vaporwave', 'chillwave', 'darkwave', 'outrun', 'cyberpunk', 'synthpop', 'chiptune', 'synth']],
    ['metal', ['metal', 'thrash', 'doom', 'grindcore', 'metalcore']],
    ['rock', ['rock', 'punk', 'grunge', 'shoegaze', 'emo', 'hardcore', 'indie', 'alternative', 'noise', 'industrial']],
    ['jazz', ['jazz', 'swing', 'bebop', 'big band', 'fusion']],
    ['blues', ['blues', 'soul', 'funk', 'motown']],
    ['hiphop', ['hip hop', 'hiphop', 'rap', 'trap', 'boom bap', 'grime', 'drill', 'old school']],
    ['classical', ['classical', 'opera', 'baroque', 'orchestral', 'symphonic', 'symphony', 'choral', 'chamber', 'piano']],
    ['reggae', ['reggae', 'dub', 'ska', 'dancehall']],
    ['latin', ['latin', 'salsa', 'bachata', 'merengue', 'cumbia', 'reggaeton', 'tango', 'samba', 'flamenco', 'bossa', 'bossa nova']],
    ['country', ['country', 'bluegrass', 'americana']],
    ['folk', ['folk', 'singer-songwriter', 'acoustic', 'celtic']],
    ['gospel', ['gospel', 'worship', 'christian', 'spiritual']],
    ['screen', ['soundtrack', 'film music', 'video game', 'video game music', 'anime']],
    ['eras', ['oldies', '60s', '70s', '80s', '90s', '2000s', 'retro', 'classic hits']],
    ['world', ['world', 'world music', 'afrobeat', 'afrobeats', 'afro', 'highlife', 'arabic', 'indian', 'bollywood', 'greek', 'balkan', 'gypsy']],
    ['electronic', ['techno', 'house', 'trance', 'edm', 'electro', 'electronic', 'electronica', 'drum and bass', 'dnb', 'dubstep', 'dance', 'club', 'garage', 'jungle', 'breakbeat', 'idm', 'acid', 'hardstyle', 'eurodance', 'psytrance', 'disco']],
    ['pop', ['pop']],
    // Last: these words qualify other genres far more often than they stand alone.
    ['ambient', ['ambient', 'new age', 'nature', 'drone', 'experimental', 'minimal']]
];

export function sceneForGenre(genre: Genre | undefined): Scene {
    if (!genre) return SCENES.lofi;

    const name = genre.toLowerCase();
    // Whole-word matching, because substrings lie: "dance" sits inside
    // "dancehall" and "dub" inside "dubstep", and both sent genres to the
    // wrong scene entirely.
    const words = new Set(name.split(/[^a-z0-9]+/).filter(Boolean));

    for (const [scene, candidates] of RULES) {
        const hit = candidates.some(candidate =>
            candidate.includes(' ') ? name.includes(candidate) : words.has(candidate)
        );
        if (hit) return SCENES[scene];
    }

    return SCENES.lofi;
}

/** Bundled clips only come in three flavours, so scenes collapse onto those. */
const BUNDLED_ROCK = new Set(['rock', 'metal', 'blues']);
const BUNDLED_SYNTH = new Set(['synthwave', 'electronic', 'screen', 'eras']);

export function bundledVideoForGenre(genre: Genre | undefined): string {
    const scene = sceneForGenre(genre).id;
    if (BUNDLED_ROCK.has(scene)) return `/videos/${getRandomRockVideoNoRepeat()}`;
    if (BUNDLED_SYNTH.has(scene)) return `/videos/${getRandomSynthwaveVideoNoRepeat()}`;
    return `/videos/${getRandomLofiVideoNoRepeat()}`;
}

/** How many recent clips to remember, so pressing G never repeats too soon. */
const HISTORY = 10;

export function useBackgroundVideo() {
    const source = ref(bundledVideoForGenre('lofi'));
    /** True while showing footage that Pexels' terms ask us to credit. */
    const fetched = ref(false);

    /** Filesystem paths recently shown, newest first. */
    let recent: string[] = [];
    /** Guards against a slow download landing after the user moved on. */
    let request = 0;

    const showBundled = (genre: Genre | undefined) => {
        fetched.value = false;
        source.value = bundledVideoForGenre(genre);
    };

    const setGenre = async (genre: Genre | undefined) => {
        const mine = ++request;
        const scene = sceneForGenre(genre);

        // Show something immediately; a first download takes seconds.
        showBundled(genre);

        let path: string | null;
        try {
            path = await invoke<string | null>('background_video', {
                scene: scene.id,
                queries: scene.queries,
                recent
            });
        } catch {
            return;
        }

        if (!path || mine !== request) return;

        recent = [path, ...recent.filter(seen => seen !== path)].slice(0, HISTORY);
        fetched.value = true;
        source.value = convertFileSrc(path);
    };

    return {source, fetched, setGenre};
}
