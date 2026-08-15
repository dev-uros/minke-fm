import {computed, ref, Ref, watch} from "vue";
import {invoke} from "@tauri-apps/api/core";
import {FormattedStation, Genre} from "../types";
import {getRandomStation} from "./useRandomStation.ts";
import {useConnectivity} from "./useConnectivity.ts";
import {useAudioEngine} from "./useAudioEngine.ts";
import {useNowPlaying} from "./useNowPlaying.ts";
import {DEFAULT_GENRE} from "./useGenres.ts";
import {clearStationCache, fetchGenre, loadCachedGenre} from "./useStationsApi.ts";

export function useStream() {

    const connectivity = useConnectivity();
    const online = connectivity.online;

    /** Only genres the user has actually visited are held in memory. */
    const stations: Ref<Record<Genre, FormattedStation[]>> = ref({});
    const currentGenre: Ref<Genre> = ref(DEFAULT_GENRE);
    const currentlyPlaying: Ref<FormattedStation | null> = ref(null);
    const previousStation: Ref<FormattedStation | null> = ref(null);
    const streamVolume = ref(1);
    const shuffle = ref(false);

    const genreLoading = ref(false);
    /** Set when a genre was reachable but had nothing playable in it. */
    const genreEmpty = ref(false);

    const genreList = (genre: Genre | undefined): FormattedStation[] =>
        genre ? stations.value[genre] ?? [] : [];

    const stationListByGenre = computed(() => genreList(currentGenre.value));
    const stationsCount = computed(() => stationListByGenre.value.length);

    const engine = useAudioEngine({
        isOnline: () => connectivity.online.value,
        onReachable: connectivity.reportReachable,
        onUnreachable: connectivity.reportUnreachable,
        onStationDead: (dead, everPlayed) => skipDeadStation(dead.id, everPlayed)
    });

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
        try {
            return await invoke<string>('prepare_stream', {url});
        } catch {
            return url;
        }
    };

    /** Guards against an earlier, slower resolve landing after a later one. */
    let playRequest = 0;

    const playStation = async (station: FormattedStation | undefined) => {
        if (!station) return;
        if (currentlyPlaying.value && currentlyPlaying.value.id !== station.id) {
            previousStation.value = currentlyPlaying.value;
        }
        // Set it up front rather than waiting for a 'play' event, so the UI is
        // honest about what we are trying to play even while reconnecting.
        currentlyPlaying.value = station;
        currentGenre.value = station.type;
        resetNowPlaying();

        const request = ++playRequest;
        const url = await resolveStreamUrl(station.url);
        if (request !== playRequest) return;

        engine.play({id: station.id, url});
    };

    /**
     * The station could not be reached while our own connection was fine, so
     * move on. A station that never produced a byte is a bad entry and gets
     * pruned; one that worked and has since gone down stays in the list, since
     * it is probably a temporary outage on their side.
     */
    function skipDeadStation(stationId: string, everPlayed: boolean) {
        const current = currentlyPlaying.value;
        if (!current) return;

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

        const cached = loadCachedGenre(genre);
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

    const getStations = async () => {
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
        clearStationCache();

        stations.value = {};
        currentlyPlaying.value = null;
        previousStation.value = null;
        shuffle.value = false;
        genreEmpty.value = false;
        currentGenre.value = DEFAULT_GENRE;
        resetNowPlaying();

        await changeGenre(DEFAULT_GENRE);
    };

    const playNextStation = () => {
        const current = currentlyPlaying.value;
        if (!current) return;

        const list = genreList(current.type);
        if (list.length === 0) return;

        if (shuffle.value) {
            void playStation(getRandomStation(list, current.id));
            return;
        }

        const index = list.findIndex(station => station.id === current.id);
        void playStation(list[(index + 1) % list.length]);
    };

    const playPreviousStation = () => {
        if (previousStation.value) {
            void playStation(previousStation.value);
        }
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

    watch(streamVolume, value => engine.setVolume(value), {immediate: true});

    const dispose = () => {
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
        online
    };
}
