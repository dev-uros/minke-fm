import {computed, ref, Ref, watch} from "vue";
import {FormattedStation, Station, StreamTypeEnum} from "../types";
import {Howl} from "howler";
import {formatStations} from "./useStationFormat.ts";
import {getRandomStation} from "./useRandomStation.ts";
import {useOnline} from "@vueuse/core";

export function useStream() {

    const online = useOnline()

    const urls = {
        lofUrl: 'http://de1.api.radio-browser.info/json/stations/bytag/lofi',
        chillhopUrl: 'http://de1.api.radio-browser.info/json/stations/bytag/chillhop',
        synthwaveUrl: 'http://de1.api.radio-browser.info/json/stations/bytag/synthwave',
        jazzhopUrl: 'http://de1.api.radio-browser.info/json/stations/bytag/jazzhop',
        vaporwaveUrl: 'http://de1.api.radio-browser.info/json/stations/bytag/vaporwave',
        chillwaveUrl: 'http://de1.api.radio-browser.info/json/stations/bytag/chillwave',
        retrowaveUrl: 'http://de1.api.radio-browser.info/json/stations/bytag/retrowave',
    }

    const lofiStreams: Ref<FormattedStation[]> = ref([]);
    const chillhopStreams: Ref<FormattedStation[]> = ref([]);
    const synthwaveStreams: Ref<FormattedStation[]> = ref([]);
    const jazzhopStreams: Ref<FormattedStation[]> = ref([]);
    const vaporwaveStreams: Ref<FormattedStation[]> = ref([]);
    const chillwaveStreams: Ref<FormattedStation[]> = ref([]);
    const retrowaveStreams: Ref<FormattedStation[]> = ref([]);

    const streamLoading = ref(false);
    const currentlyPlaying: Ref<FormattedStation | null> = ref(null);

    const stationsCount = computed(() => {
        if (currentlyPlaying.value) {
            switch (currentlyPlaying.value.type) {
                case StreamTypeEnum.LOFI:
                    return lofiStreams.value.length
                case StreamTypeEnum.CHILLHOP:
                    return chillhopStreams.value.length
                case StreamTypeEnum.SYNTHWAVE:
                    return synthwaveStreams.value.length
                case StreamTypeEnum.JAZZHOP:
                    return jazzhopStreams.value.length
                case StreamTypeEnum.VAPORWAVE:
                    return vaporwaveStreams.value.length
                case StreamTypeEnum.CHILLWAVE:
                    return chillwaveStreams.value.length
                case StreamTypeEnum.RETROWAVE:
                    return retrowaveStreams.value.length
                default :
                    return 0;
            }
        } else {
            return 0;
        }
    })

    let stream: Howl;

    const streamVolume = ref(1);

    const shuffle = ref(false);

    const previousStation: Ref<FormattedStation | null> = ref(null);

    const toggleShuffle = () => {
        shuffle.value = !shuffle.value
    }

    const getStations = async () => {
        const [
            lofiStations,
            chillhopStations,
            synthwaveStations,
            jazzhopStations,
            vaporwaveStations,
            chillwaveStations,
            retrowaveStations,
        ] = await Promise.all(
            Object.values(urls).map(async (url) => {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }
                return await response.json() as Station[];
            })
        );

        lofiStreams.value = formatStations(lofiStations, StreamTypeEnum.LOFI)
        chillhopStreams.value = formatStations(chillhopStations, StreamTypeEnum.CHILLHOP)
        synthwaveStreams.value = formatStations(synthwaveStations, StreamTypeEnum.SYNTHWAVE);
        jazzhopStreams.value = formatStations(jazzhopStations, StreamTypeEnum.JAZZHOP);
        vaporwaveStreams.value = formatStations(vaporwaveStations, StreamTypeEnum.VAPORWAVE);
        chillwaveStreams.value = formatStations(chillwaveStations, StreamTypeEnum.CHILLWAVE);
        retrowaveStreams.value = formatStations(retrowaveStations, StreamTypeEnum.RETROWAVE);


        createStream(lofiStreams.value[0]);

    }

    const createStream = (station: FormattedStation) => {
        if(!online.value) return
        streamLoading.value = true;
        if (stream) {
            stream.unload();
        }
        stream = new Howl({
            src: [station.url],
            html5: true,
            volume: streamVolume.value
        });

        play()

        stream.on('play', () => {
            previousStation.value = currentlyPlaying.value;
            currentlyPlaying.value = station;
            streamLoading.value = false;
        })


        stream.on('loaderror', function () {
            console.error('Stream failed to load');
            streamBrokenGetNextStation(station)
        });

        stream.on('playerror', () => {
            console.error('Stream failed to play');
            streamBrokenGetNextStation(station)
        })

    }

    const changeGenre = (genre: StreamTypeEnum) => {
        if(!online.value) return

        if (currentlyPlaying.value!.type === genre) return

        switch (genre) {
            case StreamTypeEnum.LOFI:
                createStream(lofiStreams.value[0])
                break;
            case StreamTypeEnum.CHILLHOP:
                createStream(chillhopStreams.value[0])
                break;
            case StreamTypeEnum.SYNTHWAVE:
                createStream(synthwaveStreams.value[0])
                break;
            case StreamTypeEnum.JAZZHOP:
                createStream(jazzhopStreams.value[0])
                break;
            case StreamTypeEnum.VAPORWAVE:
                createStream(vaporwaveStreams.value[0])
                break;
            case StreamTypeEnum.CHILLWAVE:
                createStream(chillhopStreams.value[0])
                break;

            case StreamTypeEnum.RETROWAVE:
                createStream(retrowaveStreams.value[0])
                break;

            default:
                console.error('Unsupported genre!');
                break

        }

    }

    const playPreviousStation = () => {
        if(!online.value) return

        if(previousStation.value){
            createStream(previousStation.value)
        }
    }
    const playNextStation = () => {
        if(!online.value) return

        switch (currentlyPlaying.value!.type) {
            case StreamTypeEnum.LOFI:
                const lofiStationIndex = lofiStreams.value.findIndex(lofiStation => lofiStation.id === currentlyPlaying.value!.id)
                if (lofiStreams.value.length === 0) {
                    console.error('LOFI STREAMS OUT')
                    return
                }
                if (shuffle.value) {
                    const nextStation = getRandomStation(lofiStreams.value, currentlyPlaying.value!.id);
                    createStream(nextStation);
                    return;
                }

                if (lofiStreams.value.length === lofiStationIndex) {
                    createStream(lofiStreams.value[0])
                    return
                }

                createStream(lofiStreams.value[lofiStationIndex + 1])

                break;
            case StreamTypeEnum.CHILLHOP:

                const chillhopStationIndex = chillhopStreams.value.findIndex(chillhopStation => chillhopStation.id === currentlyPlaying.value!.id)
                if (chillhopStreams.value.length === 0) {
                    console.error('chillhop STREAMS OUT')
                    return
                }
                if (shuffle.value) {
                    const nextStation = getRandomStation(chillhopStreams.value, currentlyPlaying.value!.id);
                    createStream(nextStation);
                    return;
                }

                if (chillhopStreams.value.length === chillhopStationIndex) {
                    createStream(chillhopStreams.value[0])
                    return
                }

                createStream(chillhopStreams.value[chillhopStationIndex + 1])
                break;
            case StreamTypeEnum.SYNTHWAVE:
                const synthwaveStationIndex = synthwaveStreams.value.findIndex(synthwaveStation => synthwaveStation.id === currentlyPlaying.value!.id)
                if (synthwaveStreams.value.length === 0) {
                    console.error('synthwave STREAMS OUT')
                    return
                }
                if (shuffle.value) {
                    const nextStation = getRandomStation(synthwaveStreams.value, currentlyPlaying.value!.id);
                    createStream(nextStation);
                    return;
                }

                if (synthwaveStreams.value.length === synthwaveStationIndex) {
                    createStream(synthwaveStreams.value[0])
                    return
                }

                createStream(synthwaveStreams.value[synthwaveStationIndex + 1])
                break;
            case StreamTypeEnum.JAZZHOP:
                const jazzhopStationIndex = jazzhopStreams.value.findIndex(jazzhopStation => jazzhopStation.id === currentlyPlaying.value!.id)
                if (jazzhopStreams.value.length === 0) {
                    console.error('jazzhop STREAMS OUT')
                    return
                }
                if (shuffle.value) {
                    const nextStation = getRandomStation(jazzhopStreams.value, currentlyPlaying.value!.id);
                    createStream(nextStation);
                    return;
                }

                if (jazzhopStreams.value.length === jazzhopStationIndex) {
                    createStream(jazzhopStreams.value[0])
                    return
                }

                createStream(jazzhopStreams.value[jazzhopStationIndex + 1])
                break;
            case StreamTypeEnum.VAPORWAVE:

                const vaporwaveStationIndex = vaporwaveStreams.value.findIndex(vaporwaveStation => vaporwaveStation.id === currentlyPlaying.value!.id)
                if (vaporwaveStreams.value.length === 0) {
                    console.error('vaporwave STREAMS OUT')
                    return
                }
                if (shuffle.value) {
                    const nextStation = getRandomStation(vaporwaveStreams.value, currentlyPlaying.value!.id);
                    createStream(nextStation);
                    return;
                }

                if (vaporwaveStreams.value.length === vaporwaveStationIndex) {
                    createStream(vaporwaveStreams.value[0])
                    return
                }

                createStream(vaporwaveStreams.value[vaporwaveStationIndex + 1])
                break;
            case StreamTypeEnum.CHILLWAVE:

                const chillwaveStationIndex = chillwaveStreams.value.findIndex(chillwaveStation => chillwaveStation.id === currentlyPlaying.value!.id)
                if (chillwaveStreams.value.length === 0) {
                    console.error('chillwave STREAMS OUT')
                    return
                }
                if (shuffle.value) {
                    const nextStation = getRandomStation(chillwaveStreams.value, currentlyPlaying.value!.id);
                    createStream(nextStation);
                    return;
                }

                if (chillwaveStreams.value.length === chillwaveStationIndex) {
                    createStream(chillwaveStreams.value[0])
                    return
                }

                createStream(chillwaveStreams.value[chillwaveStationIndex + 1])

                break;
            case StreamTypeEnum.RETROWAVE:

                const retrowaveStationIndex = retrowaveStreams.value.findIndex(retrowaveStation => retrowaveStation.id === currentlyPlaying.value!.id)
                if (retrowaveStreams.value.length === 0) {
                    console.error('retrowave STREAMS OUT')
                    return
                }
                if (shuffle.value) {
                    const nextStation = getRandomStation(retrowaveStreams.value, currentlyPlaying.value!.id);
                    createStream(nextStation);
                    return;
                }

                if (retrowaveStreams.value.length === retrowaveStationIndex) {
                    createStream(retrowaveStreams.value[0])
                    return
                }

                createStream(retrowaveStreams.value[retrowaveStationIndex + 1])

                break;
            default:
                console.error('Unsupported genre: ' + currentlyPlaying.value!.type)
        }

    }
    const streamBrokenGetNextStation = (station: FormattedStation) => {
        if(!online.value) return

        switch (station.type) {
            case StreamTypeEnum.LOFI:
                const lofiStationIndex = lofiStreams.value.findIndex(lofiStation => lofiStation.id === station.id)
                lofiStreams.value.splice(lofiStationIndex, 1);
                if (lofiStreams.value.length === 0) {
                    console.error('LOFI STREAMS OUT')
                    return
                }
                if (shuffle.value) {
                    const nextStation = getRandomStation(lofiStreams.value, station.id);
                    createStream(nextStation);
                    return;
                }

                if (lofiStreams.value.length === lofiStationIndex) {
                    createStream(lofiStreams.value[0])
                    return
                }

                createStream(lofiStreams.value[lofiStationIndex])

                break;
            case StreamTypeEnum.CHILLHOP:

                const chillhopStationIndex = chillhopStreams.value.findIndex(chillhopStation => chillhopStation.id === station.id)
                chillhopStreams.value.splice(chillhopStationIndex, 1);
                if (chillhopStreams.value.length === 0) {
                    console.error('chillhop STREAMS OUT')
                    return
                }
                if (shuffle.value) {
                    const nextStation = getRandomStation(chillhopStreams.value, station.id);
                    createStream(nextStation);
                    return;
                }

                if (chillhopStreams.value.length === chillhopStationIndex) {
                    createStream(chillhopStreams.value[0])
                    return
                }

                createStream(chillhopStreams.value[chillhopStationIndex])
                break;
            case StreamTypeEnum.SYNTHWAVE:
                const synthwaveStationIndex = synthwaveStreams.value.findIndex(synthwaveStation => synthwaveStation.id === station.id)
                synthwaveStreams.value.splice(synthwaveStationIndex, 1);
                if (synthwaveStreams.value.length === 0) {
                    console.error('synthwave STREAMS OUT')
                    return
                }
                if (shuffle.value) {
                    const nextStation = getRandomStation(synthwaveStreams.value, station.id);
                    createStream(nextStation);
                    return;
                }

                if (synthwaveStreams.value.length === synthwaveStationIndex) {
                    createStream(synthwaveStreams.value[0])
                    return
                }

                createStream(synthwaveStreams.value[synthwaveStationIndex])
                break;
            case StreamTypeEnum.JAZZHOP:
                const jazzhopStationIndex = jazzhopStreams.value.findIndex(jazzhopStation => jazzhopStation.id === station.id)
                jazzhopStreams.value.splice(jazzhopStationIndex, 1);
                if (jazzhopStreams.value.length === 0) {
                    console.error('jazzhop STREAMS OUT')
                    return
                }
                if (shuffle.value) {
                    const nextStation = getRandomStation(jazzhopStreams.value, station.id);
                    createStream(nextStation);
                    return;
                }

                if (jazzhopStreams.value.length === jazzhopStationIndex) {
                    createStream(jazzhopStreams.value[0])
                    return
                }

                createStream(jazzhopStreams.value[jazzhopStationIndex])
                break;
            case StreamTypeEnum.VAPORWAVE:

                const vaporwaveStationIndex = vaporwaveStreams.value.findIndex(vaporwaveStation => vaporwaveStation.id === station.id)
                vaporwaveStreams.value.splice(vaporwaveStationIndex, 1);
                if (vaporwaveStreams.value.length === 0) {
                    console.error('vaporwave STREAMS OUT')
                    return
                }
                if (shuffle.value) {
                    const nextStation = getRandomStation(vaporwaveStreams.value, station.id);
                    createStream(nextStation);
                    return;
                }

                if (vaporwaveStreams.value.length === vaporwaveStationIndex) {
                    createStream(vaporwaveStreams.value[0])
                    return
                }

                createStream(vaporwaveStreams.value[vaporwaveStationIndex])
                break;
            case StreamTypeEnum.CHILLWAVE:

                const chillwaveStationIndex = chillwaveStreams.value.findIndex(chillwaveStation => chillwaveStation.id === station.id)
                chillwaveStreams.value.splice(chillwaveStationIndex, 1);
                if (chillwaveStreams.value.length === 0) {
                    console.error('chillwave STREAMS OUT')
                    return
                }
                if (shuffle.value) {
                    const nextStation = getRandomStation(chillwaveStreams.value, station.id);
                    createStream(nextStation);
                    return;
                }

                if (chillwaveStreams.value.length === chillwaveStationIndex) {
                    createStream(chillwaveStreams.value[0])
                    return
                }

                createStream(chillwaveStreams.value[chillwaveStationIndex])

                break;
            case StreamTypeEnum.RETROWAVE:

                const retrowaveStationIndex = retrowaveStreams.value.findIndex(retrowaveStation => retrowaveStation.id === station.id)
                retrowaveStreams.value.splice(retrowaveStationIndex, 1);
                if (retrowaveStreams.value.length === 0) {
                    console.error('retrowave STREAMS OUT')
                    return
                }
                if (shuffle.value) {
                    const nextStation = getRandomStation(retrowaveStreams.value, station.id);
                    createStream(nextStation);
                    return;
                }

                if (retrowaveStreams.value.length === retrowaveStationIndex) {
                    createStream(retrowaveStreams.value[0])
                    return
                }

                createStream(retrowaveStreams.value[retrowaveStationIndex])

                break;
            default:
                console.error('Unsupported genre: ' + station.type)
        }
    }
    const play = () => {
        stream.play()
    }

    const pause = () => {
        stream.pause()
    }

    const unload = () => {
        stream.unload();
    }
    const toggleStream = () => {
        if (stream.playing()) {
            pause()
            return
        }
        play()
    }

    const setVolume = (volume: number) => {
        stream.volume(volume)
    }

    watch(streamVolume, (value) => {
        setVolume(value)
    })

    const streamStation = (station: FormattedStation) => {
        createStream(station)
    }

    const reloadStream = () => {
        if(currentlyPlaying.value){
            createStream(currentlyPlaying.value);
        }
    }
    return {
        currentlyPlaying,
        streamVolume,
        stationsCount,
        streamLoading,
        shuffle,
        getStations,
        toggleStream,
        unload,
        playNextStation,
        changeGenre,
        toggleShuffle,
        playPreviousStation,
        streamStation,
        reloadStream,
        online
    }
}