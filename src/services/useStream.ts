import {computed, ref, Ref, watch} from "vue";
import {invoke} from "@tauri-apps/api/core";
import {FormattedStation, Genre} from "../types";
import {getRandomStation} from "./useRandomStation.ts";
import {useConnectivity} from "./useConnectivity.ts";
import {AudioEngine, useAudioEngine} from "./useAudioEngine.ts";
import {useNativePlayer} from "./useNativePlayer.ts";
import {useNowPlaying} from "./useNowPlaying.ts";
import {DEFAULT_GENRE} from "./useGenres.ts";
import {clearStationCache, fetchGenre, loadCachedGenre} from "./useStationsApi.ts";
import {loadLastStation, loadLastVolume, saveLastStation, saveLastVolume} from "./useLastSession.ts";
import {useSleepTimer} from "./useSleepTimer.ts";

export function useStream(mobile = false) {

    const connectivity = useConnectivity();
    const online = connectivity.online;

    /** Only genres the user has actually visited are held in memory. */
    const stations: Ref<Record<Genre, FormattedStation[]>> = ref({});
    const currentGenre: Ref<Genre> = ref(DEFAULT_GENRE);
    const currentlyPlaying: Ref<FormattedStation | null> = ref(null);
    /**
     * Stations played before the current one, most recent last, so "previous"
     * can keep walking back instead of bouncing between the last two. Nothing
     * on screen shows it, so it is a plain array rather than a ref.
     */
    let history: FormattedStation[] = [];
    const streamVolume = ref(loadLastVolume() ?? 1);
    const shuffle = ref(false);

    const genreLoading = ref(false);
    /** Set when a genre was reachable but had nothing playable in it. */
    const genreEmpty = ref(false);

    const genreList = (genre: Genre | undefined): FormattedStation[] =>
        genre ? stations.value[genre] ?? [] : [];

    const stationListByGenre = computed(() => genreList(currentGenre.value));
    const stationsCount = computed(() => stationListByGenre.value.length);

    // Same interface either way. On Android playback lives in a Kotlin service
    // so it survives the screen locking; on desktop it is a webview <audio>.
    const shared = {
        isOnline: () => connectivity.online.value,
        onReachable: connectivity.reportReachable,
        onUnreachable: connectivity.reportUnreachable,
        onStationDead: (dead: {id: string}, everPlayed: boolean) =>
            skipDeadStation(dead.id, everPlayed)
    };

    const engine: AudioEngine = mobile
        ? useNativePlayer({
            ...shared,
            // The lock screen's skip buttons reach the service, which has no
            // idea what the station list looks like.
            onSkip: forward => (forward ? playNextStation() : playPreviousStation())
        })
        : useAudioEngine(shared);

    /** Only the very first connect blanks the UI; reconnects keep the station visible. */
    const streamLoading = computed(() => engine.state.value === 'connecting');
    const reconnecting = computed(() => engine.state.value === 'reconnecting');
    const isPlaying = computed(() => engine.state.value === 'playing');
    const needsGesture = computed(() => engine.state.value === 'blocked');
    const reconnectAttempt = computed(() => engine.attempt.value);

    const {
        nowPlaying,
        lyrics,
        stationHasMetadata,
        reset: resetNowPlaying,
        dispose: disposeNowPlaying
    } = useNowPlaying(() => currentlyPlaying.value?.name ?? null);

    /**
     * Route the stream through the Rust ICY proxy so we can read track metadata.
     * If the proxy is unavailable we play the station directly - that costs the
     * track title, never the audio.
     */
    const resolveStreamUrl = async (url: string): Promise<string> => {
        // ExoPlayer parses Icecast metadata natively, so routing through the
        // proxy on Android would only strip the very titles we want.
        if (mobile) return url;
        try {
            return await invoke<string>('prepare_stream', {url});
        } catch {
            return url;
        }
    };

    /** Guards against an earlier, slower resolve landing after a later one. */
    let playRequest = 0;

    /** Enough to retrace an evening's channel surfing, not a log of it. */
    const HISTORY_LIMIT = 20;

    /**
     * `remember` is false only when stepping back through the history itself -
     * otherwise going back would push the station we left, and "previous"
     * would ping-pong between two stations again.
     */
    const playStation = async (station: FormattedStation | undefined, remember = true) => {
        if (!station) return;
        const leaving = currentlyPlaying.value;
        if (remember && leaving && leaving.id !== station.id && history[history.length - 1]?.id !== leaving.id) {
            history.push(leaving);
            if (history.length > HISTORY_LIMIT) history.shift();
        }
        // Set it up front rather than waiting for a 'play' event, so the UI is
        // honest about what we are trying to play even while reconnecting.
        currentlyPlaying.value = station;
        currentGenre.value = station.type;
        resetNowPlaying();

        const request = ++playRequest;
        const url = await resolveStreamUrl(station.url);
        if (request !== playRequest) return;

        engine.play({
            id: station.id,
            url,
            // Ignored by the desktop engine; this is what a lock screen shows.
            title: station.name,
            artist: station.type
        });
    };

    /**
     * The station could not be reached while our own connection was fine, so
     * move on. A station that never produced a byte is a bad entry and gets
     * pruned; one that worked and has since gone down stays in the list, since
     * it is probably a temporary outage on their side.
     */
    async function skipDeadStation(stationId: string, everPlayed: boolean) {
        const current = currentlyPlaying.value;
        if (!current) return;

        // Whether it never answered or has gone down, stepping back onto it
        // would only land on the same silence.
        history = history.filter(station => station.id !== stationId);

        // A station resumed from last time, or played from favourites, arrives
        // without its genre's list. Fetch it rather than declaring the genre
        // empty just because nothing had loaded it yet.
        await ensureStations(current.type);
        if (currentlyPlaying.value !== current) return;

        // Read back through the ref: a freshly fetched list comes back raw, and
        // the splice below has to be seen by the station count.
        const list = genreList(current.type);
        const index = list.findIndex(station => station.id === stationId);

        if (!everPlayed && index !== -1) {
            list.splice(index, 1);
        }

        if (list.length === 0) {
            console.error(`No stations left for genre: ${current.type}`);
            currentlyPlaying.value = null;
            genreEmpty.value = true;
            return;
        }

        if (shuffle.value) {
            void playStation(getRandomStation(list, stationId));
            return;
        }

        if (index === -1) {
            void playStation(list[0]);
            return;
        }

        // After a splice `index` already points at the next station; without one
        // we still have to step past the station we just gave up on.
        const nextIndex = everPlayed ? index + 1 : index;
        void playStation(list[nextIndex % list.length]);
    }

    /** Guards against a slow genre load landing after the user moved on. */
    let genreRequest = 0;

    /**
     * Load a genre's stations, serving the cache first so switching feels
     * instant, then refreshing in the background when the cache is stale.
     */
    const loadGenre = async (genre: Genre): Promise<FormattedStation[]> => {
        const request = ++genreRequest;

        const cached = await loadCachedGenre(genre);
        if (cached) {
            stations.value = {...stations.value, [genre]: cached.stations};
            if (cached.fresh) return cached.stations;
        }

        if (!cached) genreLoading.value = true;
        try {
            const fresh = await fetchGenre(genre);
            if (request !== genreRequest) return genreList(genre);

            stations.value = {...stations.value, [genre]: fresh};
            return fresh;
        } catch (error) {
            connectivity.reportUnreachable();
            if (cached) return cached.stations;
            throw error;
        } finally {
            if (request === genreRequest) genreLoading.value = false;
        }
    };

    const changeGenre = async (genre: Genre) => {
        if (genre === currentGenre.value && stationsCount.value > 0) return;

        currentGenre.value = genre;
        genreEmpty.value = false;

        let list: FormattedStation[];
        try {
            list = await loadGenre(genre);
        } catch {
            genreEmpty.value = true;
            return;
        }

        if (list.length === 0) {
            genreEmpty.value = true;
            return;
        }

        await playStation(shuffle.value ? getRandomStation(list, '') : list[0]);
    };

    /**
     * Startup: back to the station that was playing when the app was closed,
     * or the default genre on a first run.
     *
     * The remembered station is played on its own, the way a favourite is -
     * its genre's list is only fetched once something needs it.
     */
    const getStations = async () => {
        const last = loadLastStation();
        if (last) {
            await playStation(last);
            return;
        }
        await changeGenre(DEFAULT_GENRE);
    };

    /**
     * Back to how the app starts on a clean machine.
     *
     * Not a reload of the current genre: `changeGenre` deliberately does nothing
     * when asked for the genre already playing, so reset has to clear the state
     * out first. The station cache goes too, otherwise "reset" would hand back
     * the same list this session had already pruned dead stations from.
     *
     * Favourites and volume are left alone - those are the user's, not the
     * radio's.
     */
    const resetAll = async () => {
        engine.stop();
        await clearStationCache();

        stations.value = {};
        currentlyPlaying.value = null;
        history = [];
        shuffle.value = false;
        genreEmpty.value = false;
        currentGenre.value = DEFAULT_GENRE;
        resetNowPlaying();

        await changeGenre(DEFAULT_GENRE);
    };

    /**
     * The current genre's stations, fetched now if they are not already here.
     *
     * Playing a favourite switches the genre without loading its list: pulling a
     * whole tag - megabytes for something like rock - to play one station nobody
     * asked to browse would spend a lot of someone's mobile data for nothing. So
     * the list is fetched at the moment it is actually needed instead, which is
     * opening the station list or stepping to the next station. Before this, a
     * favourite from an unvisited genre left `next` and `previous` silently
     * doing nothing and the search list empty.
     */
    const ensureStations = async (genre: Genre): Promise<FormattedStation[]> => {
        const existing = genreList(genre);
        if (existing.length > 0) return existing;

        try {
            return await loadGenre(genre);
        } catch {
            return [];
        }
    };

    /** For the callers that only know they are about to show the list. */
    const ensureCurrentStations = () => ensureStations(currentGenre.value);

    const playNextStation = async () => {
        const current = currentlyPlaying.value;
        if (!current) return;

        const list = await ensureStations(current.type);
        if (list.length === 0) return;

        if (shuffle.value) {
            void playStation(getRandomStation(list, current.id));
            return;
        }

        const index = list.findIndex(station => station.id === current.id);
        void playStation(list[(index + 1) % list.length]);
    };

    const playPreviousStation = () => {
        const previous = history.pop();
        if (previous) void playStation(previous, false);
    };

    const streamStation = (station: FormattedStation) => void playStation(station);

    const reloadStream = () => {
        if (currentlyPlaying.value) {
            void playStation(currentlyPlaying.value);
        }
    };

    const toggleStream = () => engine.toggle();
    const toggleShuffle = () => {
        shuffle.value = !shuffle.value;
    };

    const sleepTimer = useSleepTimer(() => engine.pause());

    /** What is actually heard: the setting, scaled down while the sleep timer fades out. */
    const effectiveVolume = computed(() => streamVolume.value * sleepTimer.fade.value);

    watch(effectiveVolume, value => engine.setVolume(value), {immediate: true});
    watch(streamVolume, saveLastVolume);

    // Saved once it actually plays, not when picked, so a station that never
    // answered is not what the next start tries first.
    watch(isPlaying, playing => {
        if (playing && currentlyPlaying.value) saveLastStation(currentlyPlaying.value);
    });

    // A confirmed track replaces the station name on the lock screen. Only the
    // native player implements this; on desktop the call simply is not there.
    watch(nowPlaying, track => {
        if (!engine.setMetadata) return;
        engine.setMetadata(
            track
                ? {title: track.song, artist: track.artist, artwork: track.artwork}
                : {title: currentlyPlaying.value?.name, artist: currentGenre.value}
        );
    });

    const dispose = () => {
        sleepTimer.dispose();
        engine.destroy();
        connectivity.dispose();
        disposeNowPlaying();
    };

    return {
        nowPlaying,
        lyrics,
        stationHasMetadata,
        currentlyPlaying,
        currentGenre,
        genreLoading,
        genreEmpty,
        streamVolume,
        stationsCount,
        streamLoading,
        reconnecting,
        isPlaying,
        needsGesture,
        reconnectAttempt,
        shuffle,
        stationListByGenre,
        ensureCurrentStations,
        getStations,
        resetAll,
        toggleStream,
        unload: dispose,
        playNextStation,
        changeGenre,
        toggleShuffle,
        playPreviousStation,
        streamStation,
        reloadStream,
        effectiveVolume,
        sleepTimeLeft: sleepTimer.timeLeft,
        cycleSleepTimer: sleepTimer.cycle,
        cancelSleepTimer: sleepTimer.cancel,
        wakeSleepTimer: sleepTimer.wake,
        online
    };
}
