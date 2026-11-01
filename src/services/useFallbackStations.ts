import type {FormattedStation, Genre} from "../types";
import {useFavorites} from "./useFavorites.ts";

/**
 * What a genre plays when radio-browser cannot be reached and the genre was
 * never cached: the user's own favourites from it, then the top stations that
 * were streaming when `npm run fallback:stations` last ran.
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

    for (const station of (await loadBundled())[genre] ?? []) {
        if (seen.has(station.id)) continue;
        seen.add(station.id);
        list.push({...station, urlResolved: station.url, type: genre});
    }

    return list;
}
