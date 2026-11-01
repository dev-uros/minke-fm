import {beforeEach, describe, expect, it, vi} from "vitest";
import {ref} from "vue";
import type {FormattedStation} from "../types";
import bundled from "../assets/fallback-stations.json";

/**
 * What a genre plays when radio-browser is down: the user's favourites from it
 * and the bundled top stations, instead of "No stations found".
 */

const api = vi.hoisted(() => ({
    fetchGenre: vi.fn(),
    loadCachedGenre: vi.fn(),
    clearStationCache: vi.fn()
}));
const played = vi.hoisted(() => [] as Array<{id: string}>);

vi.mock("./useStationsApi.ts", () => api);
vi.mock("@tauri-apps/api/core", () => ({invoke: () => Promise.reject(new Error('no tauri'))}));
vi.mock("./useNowPlaying.ts", () => ({
    useNowPlaying: () => ({
        nowPlaying: ref(null), lyrics: ref(null), stationHasMetadata: ref(false),
        reset: () => undefined, dispose: () => undefined
    })
}));
vi.mock("./useAudioEngine.ts", () => ({
    useAudioEngine: () => ({
        state: ref('idle'), attempt: ref(0), currentSource: ref(null),
        play: (source: {id: string}) => played.push(source),
        pause() {}, resume() {}, toggle() {}, stop() {}, setVolume() {}, destroy() {}
    })
}));

const station = (id: string, type: string): FormattedStation => ({
    name: `Station ${id}`, id, url: `https://example.com/${id}`, urlResolved: '',
    country: 'Serbia', state: '', type
});

const down = () => Promise.reject(new Error('503 No available server'));

/** A fresh module graph per test, so favourites are re-read from localStorage. */
async function setup(favorites: FormattedStation[] = []) {
    localStorage.clear();
    localStorage.setItem('favorites', JSON.stringify(favorites));
    vi.resetModules();
    const {useStream} = await import("./useStream.ts");
    return useStream();
}

beforeEach(() => {
    played.length = 0;
    api.fetchGenre.mockReset();
    api.loadCachedGenre.mockReset().mockResolvedValue(null);
});

describe("bundled fallback stations", () => {
    it("covers every catalogue genre with up to 20 stations", async () => {
        const {GENRE_CATALOGUE} = await import("./useGenres.ts");
        const lists = bundled as Record<string, unknown[]>;
        for (const {name} of GENRE_CATALOGUE) {
            expect(lists[name], name).toBeDefined();
            expect(lists[name].length, name).toBeLessThanOrEqual(20);
        }
        expect(lists['rock']).toHaveLength(20);
    });
});

describe("a genre while the directory is down", () => {
    it("plays the bundled stations instead of reporting nothing found", async () => {
        api.fetchGenre.mockImplementation(down);
        const stream = await setup();

        await stream.changeGenre('rock');
        await vi.waitFor(() => expect(stream.genreFallback.value).toBe(true));

        const rock = (bundled as Record<string, {id: string}[]>)['rock'];
        expect(stream.stationsCount.value).toBe(rock.length);
        expect(stream.genreEmpty.value).toBe(false);
        expect(stream.genreUnreachable.value).toBe(false);
        expect(stream.genreLoading.value).toBe(false);
        expect(played[0].id).toBe(rock[0].id);
    });

    it("puts the user's favourites from that genre first, without duplicates", async () => {
        api.fetchGenre.mockImplementation(down);
        const rock = (bundled as Record<string, Omit<FormattedStation, 'type' | 'urlResolved'>[]>)['rock'];
        const ownStation = station('mine', 'rock');
        const alsoBundled = {...rock[5], urlResolved: rock[5].url, type: 'rock'};
        const stream = await setup([ownStation, alsoBundled, station('jazz-fav', 'jazz')]);

        await stream.changeGenre('rock');

        const ids = stream.stationListByGenre.value.map(s => s.id);
        expect(ids.slice(0, 2)).toEqual(['mine', alsoBundled.id]);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids).not.toContain('jazz-fav');
        expect(played[0].id).toBe('mine');
    });

    it("plays favourites of a tag that is not in the catalogue", async () => {
        api.fetchGenre.mockImplementation(down);
        const stream = await setup([station('typed', 'serbian turbo folk')]);

        await stream.changeGenre('serbian turbo folk');

        expect(stream.stationListByGenre.value.map(s => s.id)).toEqual(['typed']);
        expect(played[0].id).toBe('typed');
    });

    it("says the directory is unreachable when there is nothing to fall back on", async () => {
        api.fetchGenre.mockImplementation(down);
        const stream = await setup();

        await stream.changeGenre('serbian turbo folk');

        expect(stream.genreUnreachable.value).toBe(true);
        expect(stream.genreEmpty.value).toBe(false);
        expect(played).toHaveLength(0);
    });

    it("keeps next working on the bundled list", async () => {
        api.fetchGenre.mockImplementation(down);
        const stream = await setup();

        await stream.changeGenre('jazz');
        await stream.playNextStation();

        const list = stream.stationListByGenre.value;
        await vi.waitFor(() => expect(played.map(s => s.id)).toEqual([list[0].id, list[1].id]));
    });

    it("prefers a stale cache over the bundle, and does not flag it", async () => {
        api.fetchGenre.mockImplementation(down);
        const cached = [station('c1', 'rock'), station('c2', 'rock'), station('c3', 'rock')];
        api.loadCachedGenre.mockResolvedValue({stations: cached, fresh: false});
        const stream = await setup();

        await stream.changeGenre('rock');
        await vi.waitFor(() => expect(api.fetchGenre).toHaveBeenCalled());
        await Promise.resolve();

        expect(stream.stationListByGenre.value.map(s => s.id)).toEqual(['c1', 'c2', 'c3']);
        expect(stream.genreFallback.value).toBe(false);
    });

    it("swaps in the full list once the directory answers again", async () => {
        api.fetchGenre.mockImplementation(down);
        const stream = await setup();
        await stream.changeGenre('rock');
        await vi.waitFor(() => expect(stream.genreFallback.value).toBe(true));

        const full = Array.from({length: 500}, (_, i) => station(`full-${i}`, 'rock'));
        api.fetchGenre.mockResolvedValue(full);
        stream.retryGenre();

        await vi.waitFor(() => expect(stream.stationsCount.value).toBe(500));
        expect(stream.genreFallback.value).toBe(false);
    });
});

describe("a genre while the directory is up", () => {
    it("starts on the bundled list and replaces it with the full one", async () => {
        let answer: (list: FormattedStation[]) => void = () => undefined;
        api.fetchGenre.mockImplementation(() => new Promise(resolve => answer = resolve));
        const stream = await setup();

        await stream.changeGenre('rock');
        expect(played).toHaveLength(1);
        expect(stream.genreLoading.value).toBe(true);

        answer(Array.from({length: 4000}, (_, i) => station(`r-${i}`, 'rock')));
        await vi.waitFor(() => expect(stream.stationsCount.value).toBe(4000));
        expect(stream.genreLoading.value).toBe(false);
        expect(stream.genreFallback.value).toBe(false);
    });

    it("does not leave the loading flag on after moving to a cached genre", async () => {
        api.fetchGenre.mockImplementation(() => new Promise(() => undefined));
        const stream = await setup();
        await stream.changeGenre('rock');
        expect(stream.genreLoading.value).toBe(true);

        api.loadCachedGenre.mockResolvedValue({stations: [station('j', 'jazz')], fresh: true});
        await stream.changeGenre('jazz');

        expect(stream.genreLoading.value).toBe(false);
    });
});
