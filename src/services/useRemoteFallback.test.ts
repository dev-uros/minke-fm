import {afterEach, describe, expect, it, vi} from "vitest";
import {isFallbackList, REMOTE_FALLBACK_URL, refreshFallback} from "./useRemoteFallback.ts";

const station = {name: 'Naxi ExYu Radio', id: 'a8dabf9f', url: 'https://example.com/naxi', country: 'Serbia', state: ''};
const list = Object.fromEntries(Array.from({length: 60}, (_, i) => [i === 0 ? 'country:rs' : `genre ${i}`, [station]]));

afterEach(() => vi.unstubAllGlobals());

describe('the weekly station list from the site', () => {
    it('takes a list of genres and countries with playable stations', () => {
        expect(isFallbackList(list)).toBe(true);
    });

    it('refuses anything else', () => {
        expect(isFallbackList(null)).toBe(false);
        expect(isFallbackList([])).toBe(false);
        expect(isFallbackList({rock: [station]})).toBe(false);
        expect(isFallbackList({...list, broken: [{...station, url: 'javascript:alert(1)'}]})).toBe(false);
        expect(isFallbackList({...list, broken: [{name: 'no id'}]})).toBe(false);
    });

    it('asks the site, and does not keep a response that is not the list', async () => {
        const fetch = vi.fn(async (_url: string) => new Response('<html>Cloudflare error</html>'));
        vi.stubGlobal('fetch', fetch);
        expect(await refreshFallback()).toBe(false);
        expect(fetch.mock.calls[0][0]).toBe(REMOTE_FALLBACK_URL);
    });
});
