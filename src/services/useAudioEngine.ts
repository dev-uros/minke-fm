import {ref, Ref} from "vue";

/**
 * A single, reused <audio> element that plays one live stream at a time.
 *
 * Everything here exists to guarantee two things:
 *
 *  1. Exactly one network connection is ever open. Switching stations tears the
 *     previous one down deterministically, so a stream can never keep playing
 *     (or keep downloading) behind the new one.
 *  2. Playback comes back on its own after any interruption - wifi drop, laptop
 *     sleep, server hiccup, ISP blip - without the user touching anything.
 */

export type PlaybackState =
    | 'idle'          // nothing selected
    | 'connecting'    // first attempt at a station
    | 'playing'
    | 'paused'        // user pressed pause
    | 'reconnecting'  // lost it, trying to get it back
    | 'blocked';      // autoplay policy needs a user gesture

export interface AudioSource {
    id: string;
    url: string;
}

interface AudioEngineOptions {
    isOnline: () => boolean;
    onReachable: () => void;
    onUnreachable: () => void;
    /**
     * The station is unreachable while our own connection is fine. `everPlayed`
     * separates a bad entry in the list (never produced a byte) from a station
     * that worked and has since gone down.
     */
    onStationDead: (source: AudioSource, everPlayed: boolean) => void;
}

/** No audible data within this long after asking to connect => give up, retry. */
const CONNECT_TIMEOUT_MS = 15_000;
/** Playhead frozen this long while "playing" => the connection died silently. */
const STALL_TIMEOUT_MS = 12_000;
const WATCHDOG_INTERVAL_MS = 2_000;
/** Failed first connects (while demonstrably online) before blaming the station. */
const MAX_CONNECT_ATTEMPTS = 3;
/**
 * Failed reconnects to a station that *did* play, while we are online, before
 * moving on. With the backoff below that is roughly a minute of trying.
 */
const MAX_RECONNECT_ATTEMPTS = 6;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 20_000;
/** While offline there is no point backing off - just poll at a calm pace. */
const OFFLINE_RETRY_MS = 4_000;

export interface AudioEngine {
    state: Ref<PlaybackState>;
    attempt: Ref<number>;
    currentSource: Ref<AudioSource | null>;
    play: (source: AudioSource) => void;
    pause: () => void;
    resume: () => void;
    toggle: () => void;
    stop: () => void;
    setVolume: (value: number) => void;
    destroy: () => void;
}

export function useAudioEngine(options: AudioEngineOptions): AudioEngine {
    const state: Ref<PlaybackState> = ref('idle');
    const attempt = ref(0);
    const currentSource: Ref<AudioSource | null> = ref(null);

    const el = new Audio();
    el.preload = 'none';
    el.autoplay = false;

    let volume = 1;
    /**
     * Bumped on every user-initiated transition. `srcGen` records which
     * generation the element's current src belongs to, so late events from a
     * torn-down stream are ignored instead of triggering a bogus reconnect.
     */
    let generation = 0;
    let srcGen = -1;
    let everPlayed = false;
    /** Consecutive failures seen while we believed the internet was up. */
    let onlineFailures = 0;
    let userPaused = false;
    let connectStartedAt = 0;
    let lastProgressAt = 0;
    let lastPlayhead = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let watchdogTimer: ReturnType<typeof setInterval> | undefined;
    let destroyed = false;

    const isCurrent = () => !destroyed && srcGen !== -1 && srcGen === generation;

    /**
     * Pausing alone leaves the request open and buffering in the background.
     * Clearing src and calling load() is what actually aborts it.
     */
    const releaseNetwork = () => {
        srcGen = -1;
        try {
            el.pause();
            el.removeAttribute('src');
            el.load();
        } catch {
            // Element already torn down - nothing to release.
        }
    };

    const clearReconnect = () => {
        if (!reconnectTimer) return;
        clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
    };

    const connect = () => {
        const source = currentSource.value;
        if (!source || destroyed) return;

        const gen = generation;
        srcGen = gen;
        connectStartedAt = Date.now();
        lastProgressAt = connectStartedAt;
        lastPlayhead = 0;
        userPaused = false;
        state.value = attempt.value > 0 ? 'reconnecting' : 'connecting';

        el.volume = volume;
        el.src = source.url;
        el.load();

        void el.play().catch((error: unknown) => {
            if (destroyed || gen !== generation) return;

            const name = error instanceof DOMException ? error.name : '';

            // We superseded this play() ourselves - not a failure.
            if (name === 'AbortError') return;

            if (name === 'NotAllowedError') {
                // Autoplay policy. Retrying burns network and can never succeed;
                // it takes a user gesture.
                releaseNetwork();
                state.value = 'blocked';
                return;
            }

            fail();
        });
    };

    const scheduleReconnect = (offline: boolean) => {
        clearReconnect();

        const delay = offline
            ? OFFLINE_RETRY_MS
            : Math.min(BACKOFF_BASE_MS * 2 ** (attempt.value - 1), BACKOFF_MAX_MS);
        const jitter = Math.floor(Math.random() * 400);
        const gen = generation;

        reconnectTimer = setTimeout(() => {
            reconnectTimer = undefined;
            if (destroyed || gen !== generation || !currentSource.value) return;
            connect();
        }, delay + jitter);
    };

    const fail = () => {
        if (!isCurrent() || userPaused) return;

        const source = currentSource.value;
        if (!source) return;

        releaseNetwork();

        const offline = !options.isOnline();
        attempt.value += 1;

        if (offline) {
            // The fault is on our side, so it says nothing about the station.
            // Forget the tally, otherwise a long outage would build up enough
            // "failures" to drop the user's station the moment wifi returns.
            onlineFailures = 0;
        } else {
            onlineFailures += 1;
            options.onUnreachable();
        }

        // While our own connection is down we retry forever - the radio has to
        // come back on its own when the wifi does. We only give up on a station
        // when we are demonstrably online and it still will not play.
        const limit = everPlayed ? MAX_RECONNECT_ATTEMPTS : MAX_CONNECT_ATTEMPTS;

        if (!offline && onlineFailures >= limit) {
            const dead = source;
            const played = everPlayed;
            currentSource.value = null;
            state.value = 'idle';
            attempt.value = 0;
            onlineFailures = 0;
            options.onStationDead(dead, played);
            return;
        }

        state.value = 'reconnecting';
        scheduleReconnect(offline);
    };

    const onPlaying = () => {
        if (!isCurrent()) return;
        everPlayed = true;
        onlineFailures = 0;
        attempt.value = 0;
        userPaused = false;
        lastProgressAt = Date.now();
        lastPlayhead = el.currentTime;
        state.value = 'playing';
        options.onReachable();
    };

    const onProgress = () => {
        if (!isCurrent()) return;
        lastProgressAt = Date.now();
    };

    // A live stream has no end. If it "ended", the server hung up on us.
    const onEnded = () => fail();

    const onError = () => fail();

    const onPause = () => {
        // Tearing a stream down calls el.pause(), and that event lands one task
        // later - by which time we may already be connecting to the next
        // station. Only a pause that interrupts actual playback is a failure.
        if (userPaused || state.value !== 'playing') return;
        fail();
    };

    el.addEventListener('playing', onPlaying);
    el.addEventListener('progress', onProgress);
    el.addEventListener('timeupdate', onProgress);
    el.addEventListener('ended', onEnded);
    el.addEventListener('error', onError);
    el.addEventListener('pause', onPause);

    /**
     * The events above cover loud failures. This covers the quiet ones: a
     * connection that stops delivering data without erroring, and waking from
     * sleep with a dead socket. Both look identical - a frozen playhead.
     */
    const watchdog = () => {
        if (!isCurrent()) return;

        const now = Date.now();

        if (state.value === 'connecting' || state.value === 'reconnecting') {
            if (now - connectStartedAt > CONNECT_TIMEOUT_MS) fail();
            return;
        }

        if (state.value !== 'playing') return;

        if (el.paused) {
            fail();
            return;
        }

        if (el.currentTime !== lastPlayhead) {
            lastPlayhead = el.currentTime;
            lastProgressAt = now;
            return;
        }

        if (now - lastProgressAt > STALL_TIMEOUT_MS) fail();
    };

    const startWatchdog = () => {
        if (watchdogTimer || destroyed) return;
        watchdogTimer = setInterval(watchdog, WATCHDOG_INTERVAL_MS);
    };

    const stopWatchdog = () => {
        if (!watchdogTimer) return;
        clearInterval(watchdogTimer);
        watchdogTimer = undefined;
    };

    const play = (source: AudioSource) => {
        if (destroyed) return;
        generation += 1;
        clearReconnect();
        releaseNetwork();
        currentSource.value = source;
        everPlayed = false;
        onlineFailures = 0;
        attempt.value = 0;
        userPaused = false;
        startWatchdog();
        connect();
    };

    const pause = () => {
        if (destroyed || !currentSource.value) return;
        generation += 1;
        userPaused = true;
        clearReconnect();
        // Hold no connection while paused. A paused live stream would otherwise
        // keep downloading audio we will never play.
        releaseNetwork();
        stopWatchdog();
        state.value = 'paused';
    };

    const resume = () => {
        if (destroyed || !currentSource.value) return;
        generation += 1;
        clearReconnect();
        everPlayed = false;
        onlineFailures = 0;
        attempt.value = 0;
        userPaused = false;
        startWatchdog();
        connect();
    };

    const toggle = () => {
        if (state.value === 'paused' || state.value === 'blocked' || state.value === 'idle') {
            resume();
            return;
        }
        pause();
    };

    const stop = () => {
        generation += 1;
        clearReconnect();
        releaseNetwork();
        stopWatchdog();
        currentSource.value = null;
        attempt.value = 0;
        state.value = 'idle';
    };

    const setVolume = (value: number) => {
        volume = Math.min(1, Math.max(0, value));
        el.volume = volume;
    };

    const destroy = () => {
        if (destroyed) return;
        destroyed = true;
        stopWatchdog();
        clearReconnect();
        releaseNetwork();
        el.removeEventListener('playing', onPlaying);
        el.removeEventListener('progress', onProgress);
        el.removeEventListener('timeupdate', onProgress);
        el.removeEventListener('ended', onEnded);
        el.removeEventListener('error', onError);
        el.removeEventListener('pause', onPause);
        currentSource.value = null;
        state.value = 'idle';
    };

    return {
        state,
        attempt,
        currentSource,
        play,
        pause,
        resume,
        toggle,
        stop,
        setVolume,
        destroy
    };
}
