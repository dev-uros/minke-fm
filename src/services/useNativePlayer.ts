import {ref, Ref} from "vue";
import {addPluginListener, invoke, PluginListener} from "@tauri-apps/api/core";
import {emit} from "@tauri-apps/api/event";
import {AudioEngine, AudioSource, PlaybackState} from "./useAudioEngine.ts";

/**
 * The Android player, standing in for `useAudioEngine` behind the same interface.
 *
 * Playback happens in a Kotlin MediaSessionService, not in this webview, because
 * Android suspends webview media the moment the app is backgrounded. Everything
 * above this file - `useStream`, `useNowPlaying`, the modals - is unaware of the
 * difference.
 *
 * ExoPlayer reads Icecast metadata itself, so the Rust ICY proxy the desktop
 * build depends on is not involved here. To keep `useNowPlaying` identical on
 * both platforms, the titles it produces are re-emitted under the same event
 * names the proxy uses.
 */

interface PlayerState {
    playing: boolean;
    state: 'idle' | 'buffering' | 'ready' | 'ended' | 'unknown';
}

interface PlayerError {
    code: string;
    message: string;
}

interface StationSkip {
    forward: boolean;
}

interface NativePlayerOptions {
    isOnline: () => boolean;
    onReachable: () => void;
    onUnreachable: () => void;
    onStationDead: (source: AudioSource, everPlayed: boolean) => void;
    /** The lock screen's skip buttons, which know nothing of the station list. */
    onSkip: (forward: boolean) => void;
}

/**
 * How hard to try before moving off a station, while online.
 *
 * The two cases are not the same problem. A station that played and then
 * dropped is almost always the network, and is worth waiting out - each of
 * those attempts is a whole cycle of the service's load retries and backoff,
 * so four is roughly a minute. A station that never made a sound is most likely
 * just broken, and every second spent on it is a second of silence before the
 * next one: two attempts, and the service does no load retries at all before
 * the first byte of audio, so those two arrive within seconds.
 *
 * The desktop engine has drawn this same distinction from the start
 * (MAX_CONNECT_ATTEMPTS vs MAX_RECONNECT_ATTEMPTS); only this side was flat.
 */
const MAX_CONNECT_ERRORS = 2;
const MAX_RECONNECT_ERRORS = 4;

export function useNativePlayer(options: NativePlayerOptions): AudioEngine {
    const state: Ref<PlaybackState> = ref('idle');
    const attempt = ref(0);
    const currentSource: Ref<AudioSource | null> = ref(null);

    let everPlayed = false;
    let errorCount = 0;
    let userPaused = false;
    const listeners: PluginListener[] = [];

    const call = (command: string, args: Record<string, unknown> = {}) =>
        invoke(`plugin:player|${command}`, args).catch(() => undefined);

    void addPluginListener('player', 'state', (payload: PlayerState) => {
        if (payload.playing) {
            everPlayed = true;
            errorCount = 0;
            attempt.value = 0;
            userPaused = false;
            state.value = 'playing';
            options.onReachable();
            return;
        }

        switch (payload.state) {
            case 'buffering':
                // Not distinguished from a first connect on purpose: to the UI
                // both mean "working on it".
                state.value = attempt.value > 0 ? 'reconnecting' : 'connecting';
                break;
            case 'idle':
                state.value = currentSource.value ? 'connecting' : 'idle';
                break;
            default:
                state.value = userPaused ? 'paused' : state.value;
        }
    }).then(listener => listeners.push(listener));

    /*
     * Reconnecting itself is the service's job, not this file's.
     *
     * The desktop engine retries from here, but on Android the webview is
     * throttled or suspended whenever the app is backgrounded - precisely when
     * a radio most needs to recover. `PlaybackService` retries with its own
     * backoff and jumps the queue when the network returns; each error event
     * that reaches here is one of those attempts already having failed.
     *
     * What stays here is the one decision the service cannot make: giving up on
     * a station, which needs the station list this side owns.
     */
    void addPluginListener('player', 'error', (_payload: PlayerError) => {
        const source = currentSource.value;
        if (!source || userPaused) return;

        attempt.value += 1;
        options.onUnreachable();
        state.value = 'reconnecting';

        if (!options.isOnline()) {
            // Our own connection, so it says nothing about the station. The
            // service keeps trying either way.
            errorCount = 0;
            return;
        }

        // Only give up on a station while someone is watching. Backgrounded,
        // the service's retries are the right answer anyway - and the errors
        // that pile up during a long outage are delivered to this webview all
        // at once when it wakes, which would abandon a station that is playing
        // again by the time they arrive.
        if (document.visibilityState !== 'visible') {
            errorCount = 0;
            return;
        }

        errorCount += 1;
        if (errorCount < (everPlayed ? MAX_RECONNECT_ERRORS : MAX_CONNECT_ERRORS)) return;

        const dead = source;
        const played = everPlayed;
        currentSource.value = null;
        state.value = 'idle';
        errorCount = 0;
        attempt.value = 0;
        // Leaves the service holding a station nobody wants; the `play` that
        // follows replaces the item, and `stop` clears `playWhenReady` so a
        // queued retry finds nothing to do.
        options.onStationDead(dead, played);
    }).then(listener => listeners.push(listener));

    // Icecast titles arrive from ExoPlayer rather than the Rust proxy. Re-emitted
    // under the proxy's event names so `useNowPlaying` needs no mobile branch.
    void addPluginListener('player', 'title', (payload: {title: string}) => {
        void emit('icy:title', payload.title);
    }).then(listener => listeners.push(listener));

    void addPluginListener('player', 'station', (payload: StationSkip) => {
        options.onSkip(payload.forward);
    }).then(listener => listeners.push(listener));

    const toRequest = (source: AudioSource) => ({
        url: source.url,
        title: source.title ?? null,
        artist: source.artist ?? null,
        artwork: source.artwork ?? null
    });

    const play = (source: AudioSource) => {
        currentSource.value = source;
        everPlayed = false;
        errorCount = 0;
        attempt.value = 0;
        userPaused = false;
        state.value = 'connecting';

        // Tells `useNowPlaying` to forget the previous station's track, exactly
        // as the desktop proxy's connect event does.
        void emit('icy:connected', {hasMetadata: true, icyName: null, contentType: ''});
        void call('player_play', {request: toRequest(source)});
    };

    const setMetadata = (metadata: Pick<AudioSource, 'title' | 'artist' | 'artwork'>) => {
        const source = currentSource.value;
        if (!source) return;
        // Merged into the source so a later reconnect keeps the same display.
        Object.assign(source, metadata);
        // Deliberately not `player_play`: that restarts the stream, which turned
        // every announced track into a fresh buffering cycle.
        void call('player_set_metadata', {request: toRequest(source)});
    };

    const pause = () => {
        userPaused = true;
        state.value = 'paused';
        void call('player_pause');
    };

    const resume = () => {
        userPaused = false;
        state.value = 'connecting';
        void call('player_resume');
    };

    const toggle = () => {
        if (state.value === 'paused' || state.value === 'idle' || state.value === 'blocked') {
            resume();
            return;
        }
        pause();
    };

    const stop = () => {
        currentSource.value = null;
        attempt.value = 0;
        state.value = 'idle';
        void call('player_stop');
    };

    const setVolume = (value: number) => {
        void call('player_set_volume', {volume: Math.min(1, Math.max(0, value))});
    };

    const destroy = () => {
        void call('player_stop');
        while (listeners.length) void listeners.pop()!.unregister();
    };

    return {
        state,
        attempt,
        currentSource,
        play,
        setMetadata,
        pause,
        resume,
        toggle,
        stop,
        setVolume,
        destroy
    };
}
