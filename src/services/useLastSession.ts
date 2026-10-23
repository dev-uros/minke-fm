import {FormattedStation} from "../types";

/**
 * What the app was doing when it was last closed: the station and the volume,
 * so the next start picks up there instead of on the default genre at full
 * volume.
 *
 * Plain localStorage, like the favourites - two small values, read once.
 */

const STATION_KEY = 'last-station';
const VOLUME_KEY = 'last-volume';

function read(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function write(key: string, value: string) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Quota or private mode - the app simply starts fresh next time.
    }
}

/** A station saved by an older build, or edited by hand, is not trusted blindly. */
function isStation(value: unknown): value is FormattedStation {
    if (!value || typeof value !== 'object') return false;
    const station = value as Record<string, unknown>;
    return ['id', 'name', 'url', 'type'].every(field => typeof station[field] === 'string' && station[field] !== '');
}

export function loadLastStation(): FormattedStation | null {
    const stored = read(STATION_KEY);
    if (!stored) return null;
    try {
        const parsed: unknown = JSON.parse(stored);
        return isStation(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export function saveLastStation(station: FormattedStation) {
    write(STATION_KEY, JSON.stringify(station));
}

/** Volume as last set, or null when there is nothing usable saved. */
export function loadLastVolume(): number | null {
    const stored = read(VOLUME_KEY);
    if (stored === null) return null;
    const volume = Number(stored);
    return Number.isFinite(volume) && volume >= 0 && volume <= 1 ? volume : null;
}

export function saveLastVolume(volume: number) {
    write(VOLUME_KEY, String(volume));
}
