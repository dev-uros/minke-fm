import {ref, Ref} from "vue";
import {listen, UnlistenFn} from "@tauri-apps/api/event";
import {invoke} from "@tauri-apps/api/core";

/**
 * Everything we know about what is playing right now.
 *
 * ICY carries exactly one field, and stations use it for two different things:
 * the song that is playing, and their own station ident ("EUROPE 2 - POP RADIO",
 * "RADIO BOB - Power Metal"). Both arrive looking identical. Showing an ident as
 * if it were a song is worse than showing nothing, so anything we cannot confirm
 * is a track is dropped and the UI falls back to the station name.
 *
 * Album and lyrics are then looked up separately, and each appears only when the
 * match was verified. Every field here is independently optional.
 *
 * Lyrics are untimed on purpose. Karaoke highlighting was built and removed:
 * the timing worked, but a lyrics database times against one recording while
 * radio plays another, and that error grows through the song instead of staying
 * constant, so it cannot be corrected by any offset.
 */

export interface NowPlaying {
    artist: string;
    song: string;
    /** Filled in afterwards, and only when the store match was confirmed. */
    album?: string;
    artwork?: string;
    year?: string;
}

export interface Lyrics {
    /** The transcript, one entry per line. Never empty. */
    lines: string[];
}

interface IcyConnected {
    hasMetadata: boolean;
    icyName: string | null;
    contentType: string;
}

interface TrackInfo {
    album: string;
    artwork: string | null;
    year: string | null;
}

const normalize = (value: string | null | undefined) =>
    (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Short names match too easily by accident, so they are not evidence. */
const MIN_NAME_LENGTH = 4;

/**
 * Plenty of stations never set icy-name and ship the server default. Treating
 * those as the station's identity would reject real bands called "No Name".
 */
const PLACEHOLDER_NAMES = new Set([
    'noname', 'nonamestation', 'unknown', 'unnamed', 'unspecifiedname',
    'default', 'radio', 'stream', 'mystation', 'icecast', 'shoutcast'
]);

export function classifyTitle(
    title: string,
    icyName: string | null,
    stationName: string | null
): NowPlaying | null {
    // Real streams use backticks for apostrophes and pad with double spaces.
    const clean = title.replace(/`/g, "'").replace(/\s+/g, ' ').trim();

    const separator = clean.indexOf(' - ');
    if (separator === -1) return null;

    const artist = clean.slice(0, separator).trim();
    const song = clean.slice(separator + 3).trim();
    if (!artist || !song) return null;

    const parts = [normalize(artist), normalize(song)];

    // If either half echoes what the broadcaster calls itself, this is an ident.
    for (const candidate of [icyName, stationName]) {
        const name = normalize(candidate);
        if (name.length < MIN_NAME_LENGTH) continue;
        if (PLACEHOLDER_NAMES.has(name)) continue;

        for (const part of parts) {
            if (part.length < MIN_NAME_LENGTH) continue;
            if (part.includes(name) || name.includes(part)) return null;
        }
    }

    return {artist, song};
}

export function useNowPlaying(stationName: () => string | null) {
    const nowPlaying: Ref<NowPlaying | null> = ref(null);
    const lyrics: Ref<Lyrics | null> = ref(null);
    /** False once we know the station sends no metadata at all. */
    const stationHasMetadata = ref(true);
    let icyName: string | null = null;
    const unlisteners: UnlistenFn[] = [];

    /** Bumped whenever the track changes, so a slow lookup cannot land late. */
    let lookupRequest = 0;

    const clearTrack = () => {
        lookupRequest += 1;
        nowPlaying.value = null;
        lyrics.value = null;
    };

    /**
     * Ask for album and lyrics. Failure is silent on purpose - the artist and
     * song came from the station itself and stand on their own; the extras
     * either arrive confirmed or not at all.
     */
    const enrich = async (track: NowPlaying) => {
        const request = ++lookupRequest;

        const stillCurrent = () => {
            if (request !== lookupRequest) return false;
            const current = nowPlaying.value;
            return current?.artist === track.artist && current?.song === track.song;
        };

        const [album, words] = await Promise.all([
            invoke<TrackInfo | null>('lookup_track', {artist: track.artist, song: track.song})
                .catch(() => null),
            invoke<Lyrics | null>('lookup_lyrics', {artist: track.artist, song: track.song})
                .catch(() => null)
        ]);

        if (!stillCurrent()) return;

        if (album) {
            nowPlaying.value = {
                ...nowPlaying.value!,
                album: album.album,
                artwork: album.artwork ?? undefined,
                year: album.year ?? undefined
            };
        }
        lyrics.value = words;
    };

    const reset = () => {
        clearTrack();
        icyName = null;
        stationHasMetadata.value = true;
    };

    void listen<IcyConnected>('icy:connected', event => {
        icyName = event.payload.icyName;
        stationHasMetadata.value = event.payload.hasMetadata;
        clearTrack();
    }).then(un => unlisteners.push(un));

    void listen<string>('icy:title', event => {
        const track = classifyTitle(event.payload, icyName, stationName());
        clearTrack();
        if (!track) return;

        nowPlaying.value = track;
        void enrich(track);
    }).then(un => unlisteners.push(un));

    const dispose = () => {
        while (unlisteners.length) unlisteners.pop()!();
    };

    return {nowPlaying, lyrics, stationHasMetadata, reset, dispose};
}
