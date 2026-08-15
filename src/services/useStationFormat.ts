import {FormattedStation, Genre, Station} from "../types";

/**
 * The webview runs on a secure custom scheme, so plain-http streams are the
 * first thing WKWebView refuses to load. We keep them - some good stations are
 * http-only - but sort them last so we try the ones most likely to work first.
 */
const isSecure = (url: string) => url.startsWith('https://');

/**
 * .pls/.m3u are text playlists, not audio - an <audio> element cannot play
 * them. (.m3u8 is HLS, which WebKit does handle natively, so it stays.)
 */
const isPlaylistFile = (url: string) => /\.(pls|m3u|asx)(\?|$)/i.test(url);

/**
 * Broadcasters register the same station many times over - different mounts,
 * bitrates or mirrors - so "Radio Swiss Jazz" turns up four times in one genre
 * and "ROCK FM" three. Deduplicating by URL misses all of those, because the
 * URLs genuinely differ. Matching on the name is what collapses them.
 */
const nameKey = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9À-￿]/g, '');

export function formatStations(stations: Station[], type: Genre): FormattedStation[] {
    const seenUrls = new Set<string>();
    const seenNames = new Set<string>();
    const formatted: FormattedStation[] = [];

    for (const station of stations) {
        // url_resolved has redirects already followed, which is one less hop
        // that can fail mid-stream.
        const url = (station.url_resolved || station.url || '').trim();
        if (!url || !/^https?:\/\//i.test(url)) continue;
        if (station.lastcheckok === 0) continue;
        if (isPlaylistFile(url)) continue;
        if (seenUrls.has(url)) continue;

        const name = station.name?.trim() || 'Unknown station';
        const key = nameKey(name);
        // Callers order by popularity, so the first copy seen is the best one.
        if (key && seenNames.has(key)) continue;

        seenUrls.add(url);
        if (key) seenNames.add(key);

        formatted.push({
            name,
            id: station.stationuuid,
            url,
            urlResolved: station.url_resolved,
            country: station.country,
            state: station.state,
            type
        });
    }

    return formatted.sort((a, b) => Number(isSecure(b.url)) - Number(isSecure(a.url)));
}
