/**
 * The text search behind the station list, the genres and the countries.
 *
 * Forgiving in the ways people actually type on a phone: no matter the case, the
 * accents ("sao" finds São Paulo), the punctuation ("radio1" finds "Radio 1"), the
 * order of the words ("koper radio" finds "Radio Koper"), or one slip of the finger
 * in a longer word ("slovnia" finds Slovenia). The better a match, the higher it
 * comes; equal matches keep the order they came in, which is the most listened first.
 */

/** Lower case, accents and punctuation gone, words separated by single spaces. */
export function fold(text: string): string {
    return text
        .normalize('NFD')
        .replace(/\p{M}+/gu, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

/** Edits (insert, delete, change, swap two neighbours) between a and b, up to `limit + 1`. */
function distance(a: string, b: string, limit: number): number {
    if (Math.abs(a.length - b.length) > limit) return limit + 1;
    const rows: number[][] = Array.from({length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) rows[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        let best = Infinity;
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            let d = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, rows[i - 2][j - 2] + 1);
            rows[i][j] = d;
            best = Math.min(best, d);
        }
        if (best > limit) return limit + 1;
    }
    return rows[a.length][b.length];
}

/** How well one typed word matches the words of a name: 0 when it does not, 1 for a slip. */
function wordScore(token: string, words: string[], joined: string, slips: boolean): number {
    let score = 0;
    for (const word of words) {
        if (word === token) return 4;
        if (word.startsWith(token)) score = Math.max(score, 3);
        else if (word.includes(token)) score = Math.max(score, 2);
    }
    // "radio1" against "radio 1": the name with its spaces taken out.
    if (!score && joined.includes(token)) score = 2;
    if (score || !slips || token.length < 4) return score;
    // A slip: the typed word against the start of each word, a letter longer or the same length.
    const slip = words.some(word =>
        distance(token, word.slice(0, token.length + 1), 1) <= 1 || distance(token, word.slice(0, token.length), 1) <= 1);
    return slip ? 1 : 0;
}

interface Match {
    score: number;
    /** Only matched by forgiving a typo somewhere. */
    slip: boolean;
}

interface Folded {
    text: string;
    words: string[];
    joined: string;
}

/**
 * Names folded once and kept: a search runs on every letter, over up to 7,000 station
 * names, and folding (Unicode normalisation and two regular expressions) was most of
 * the time it took.
 */
const foldedNames = new Map<string, Folded>();
function folded(name: string): Folded {
    let entry = foldedNames.get(name);
    if (!entry) {
        const text = fold(name);
        entry = {text, words: text.split(' '), joined: text.replace(/ /g, '')};
        if (foldedNames.size > 50_000) foldedNames.clear();
        foldedNames.set(name, entry);
    }
    return entry;
}

function match(query: string, names: string[], slips: boolean): Match {
    const typed = folded(query).text;
    if (!typed) return {score: 1, slip: false};
    const tokens = typed.split(' ');
    let best: Match = {score: 0, slip: false};
    for (const name of names) {
        const {text, words, joined} = folded(name);
        if (!text) continue;
        let total = 0;
        let slip = false;
        for (const token of tokens) {
            const score = wordScore(token, words, joined, slips);
            if (!score) {
                total = 0;
                break;
            }
            if (score === 1) slip = true;
            total += score;
        }
        if (total && text.startsWith(typed)) total += 5;
        if (total > best.score || (total === best.score && !slip)) best = {score: total, slip};
    }
    return best;
}

/** How well `query` matches any of `names`; 0 is no match. Every typed word must match. */
export function matchScore(query: string, names: string[]): number {
    return match(query, names, true).score;
}

/**
 * The items that match, best first; ties keep their order. Typos are forgiven only
 * when nothing matches as typed, so "slovnia" finds Slovenia, but "radio1" does not
 * bring every "Radio ..." along with "Radio 1".
 */
export function searchBy<T>(items: T[], query: string, names: (item: T) => string[]): T[] {
    if (!folded(query).text) return items;
    const run = (slips: boolean) => items
        .map((item, index) => ({item, index, ...match(query, names(item), slips)}))
        .filter(entry => entry.score > 0);
    // Typos are only looked for when nothing matches as typed: cheaper, and no noise.
    const found = run(false);
    return (found.length ? found : run(true))
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .map(entry => entry.item);
}
