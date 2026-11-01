import {Genre} from "../../types";

/**
 * What every skinned player is given and what it can ask for - the cassette's
 * interface, less help (hotkeys mean nothing on a phone) and with the genre
 * picker raised to the phone root instead of owned by the player.
 */
export interface PlayerProps {
    currentGenre: Genre;
    stationCount: number;
    shuffle: boolean;
    isPlaying: boolean;
    /** Stable per station, for anything that should move when it changes. */
    stationKey: string;
}

export type PlayerEmits = {
    togglePlayer: [toggle: boolean];
    playNext: [];
    playPrevious: [];
    toggleShuffle: [];
    openGenres: [];
    openFavorites: [];
    openStations: [];
    resetAll: [];
};

/** 0..1, the same for the same string - a dial position that means nothing but never jumps around. */
export function positionOf(key: string): number {
    let hash = 2166136261;
    for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967295;
}
