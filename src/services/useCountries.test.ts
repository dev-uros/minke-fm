import {afterEach, describe, expect, it, vi} from "vitest";
import {countryCodeOf, countryGenre, countryName, isCountryGenre} from "./useCountries.ts";
import {genreLabel} from "./useGenres.ts";
import {fetchGenre} from "./useStationsApi.ts";

const station = (uuid: string, name: string, extra: Record<string, unknown> = {}) => ({
    stationuuid: uuid, name, url: `https://example.com/${uuid}`, url_resolved: `https://example.com/${uuid}`,
    lastcheckok: 1, country: 'Serbia', countrycode: 'RS', state: '', tags: '', ...extra
});

afterEach(() => vi.unstubAllGlobals());

describe('countries as genres', () => {
    it('round-trips a country through its genre key', () => {
        expect(countryGenre('RS')).toBe('country:rs');
        expect(isCountryGenre('country:rs')).toBe(true);
        expect(isCountryGenre('rock')).toBe(false);
        expect(countryCodeOf('country:rs')).toBe('RS');
    });

    it('labels a country by its name and leaves a tag as it is', () => {
        expect(countryName('RS')).toBe('Serbia');
        expect(countryName('CN')).toBe('China');
        expect(genreLabel('country:de')).toBe('Germany');
        expect(genreLabel('deep house')).toBe('deep house');
    });

    it('asks the directory for a country by its code, not as a tag', async () => {
        const fetch = vi.fn(async (_url: string) => new Response(JSON.stringify([station('a', 'Naxi')])));
        vi.stubGlobal('fetch', fetch);
        vi.stubGlobal('indexedDB', undefined);
        const stations = await fetchGenre('country:rs');
        expect(String(fetch.mock.calls[0][0])).toContain('/json/stations/bycountrycodeexact/RS?');
        expect(stations[0]).toMatchObject({name: 'Naxi', type: 'country:rs'});
    });
});
