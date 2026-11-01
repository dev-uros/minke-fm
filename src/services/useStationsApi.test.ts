import {afterEach, describe, expect, it, vi} from "vitest";
import {fetchGenre} from "./useStationsApi.ts";

vi.mock("./useStationCache.ts", () => ({
    readGenre: vi.fn(), writeGenre: vi.fn(() => Promise.resolve()), clearGenres: vi.fn()
}));

const stationJson = {
    stationuuid: 'a', name: 'Radio A', url: 'https://a.example/stream',
    url_resolved: 'https://a.example/stream', country: 'Serbia', state: '', lastcheckok: 1
};

const unavailable = () => new Response('No available server', {status: 503});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe("fetchGenre", () => {
    it("goes round the mirrors again after a burst of 503s", async () => {
        vi.useFakeTimers();
        const fetch = vi.fn()
            .mockResolvedValueOnce(unavailable())
            .mockResolvedValueOnce(unavailable())
            .mockResolvedValueOnce(unavailable())
            .mockResolvedValue(new Response(JSON.stringify([stationJson])));
        vi.stubGlobal('fetch', fetch);

        const result = fetchGenre('rock');
        await vi.runAllTimersAsync();

        expect((await result).map(s => s.id)).toEqual(['a']);
        expect(fetch).toHaveBeenCalledTimes(4);
    });

    it("gives up after the last round", async () => {
        vi.useFakeTimers();
        const fetch = vi.fn(() => Promise.resolve(unavailable()));
        vi.stubGlobal('fetch', fetch);

        const result = fetchGenre('rock');
        const failed = expect(result).rejects.toThrow('503');
        await vi.runAllTimersAsync();
        await failed;

        // Two mirrors, four rounds.
        expect(fetch).toHaveBeenCalledTimes(8);
    });
});
