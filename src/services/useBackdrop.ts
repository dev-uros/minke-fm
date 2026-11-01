import {shallowRef} from "vue";
import {Genre} from "../types";
import {Backdrop, pickBackdrop} from "../backdrops";

/**
 * Picks the animated backdrop for a genre.
 *
 * There are thousands of playable genres, so they map onto a handful of
 * *scenes*, and each scene has its own set of pixel animations in
 * `src/backdrops/<scene>/`.
 */

/**
 * Genre to scene, first match wins - so order matters twice over.
 *
 * Specific families come first and vague modifiers last: "rock experimental"
 * has to land on rock, while a bare "experimental" belongs with the abstract
 * scenes. Likewise "minimal techno" is electronic, but "minimal" alone is not.
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

export function sceneForGenre(genre: Genre | undefined): string {
    if (!genre) return 'lofi';

    const name = genre.toLowerCase();
    // Whole-word matching, because substrings lie: "dance" sits inside
    // "dancehall" and "dub" inside "dubstep", and both sent genres to the
    // wrong scene entirely.
    const words = new Set(name.split(/[^a-z0-9]+/).filter(Boolean));

    for (const [scene, candidates] of RULES) {
        const hit = candidates.some(candidate =>
            candidate.includes(' ') ? name.includes(candidate) : words.has(candidate)
        );
        if (hit) return scene;
    }

    return 'lofi';
}

export function useBackdrop() {
    const backdrop = shallowRef<Backdrop | null>(pickBackdrop('lofi', null));

    /** Shows a backdrop for the genre; called again for the same genre, it moves to another one. */
    const setGenre = (genre: Genre | undefined) => {
        backdrop.value = pickBackdrop(sceneForGenre(genre), backdrop.value);
    };

    return {backdrop, setGenre};
}
