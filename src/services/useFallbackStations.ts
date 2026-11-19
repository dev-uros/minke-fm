import type {FormattedStation, Genre} from "../types";
import {useFavorites} from "./useFavorites.ts";
import {savedFallback} from "./useRemoteFallback.ts";

/**
 * What a genre (or a country) plays when radio-browser cannot be reached and it
 * was never cached: the user's own favourites from it, then the top stations that
 * were streaming when `npm run fallback:stations` last ran - this week's run,
 * downloaded from the site (useRemoteFallback.ts), or the one shipped in the app.
 *
 * The bundled file is loaded on first use rather than imported, so its few
 * hundred kilobytes stay out of the startup bundle.
 */

type FallbackStation = Pick<FormattedStation, 'name' | 'id' | 'url' | 'country' | 'state'>;

let bundled: Promise<Record<Genre, FallbackStation[]>> | null = null;

const loadBundled = () => {
    bundled ??= import("../assets/fallback-stations.json")
        .then(module => module.default as Record<Genre, FallbackStation[]>)
        .catch(() => {
            bundled = null;
            return {};
        });
    return bundled;
};

/** A fresh array every time: the caller splices dead stations out of it. */
export async function fallbackStations(genre: Genre): Promise<FormattedStation[]> {
    const {favorites} = useFavorites();
    const list: FormattedStation[] = favorites.value
        .filter(station => station.type === genre)
        .map(station => ({...station}));
    const seen = new Set(list.map(station => station.id));

    // This week's list from the site when the device has it and it covers this genre
    // or country; the one shipped in the app otherwise.
    const downloaded = (await savedFallback())?.[genre];
    for (const station of downloaded ?? (await loadBundled())[genre] ?? []) {
        if (seen.has(station.id)) continue;
        seen.add(station.id);
        list.push({...station, urlResolved: station.url, type: genre});
    }

    return list;
}
