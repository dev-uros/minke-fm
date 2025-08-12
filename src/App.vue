<script setup lang="ts">
import {onMounted, onUnmounted, ref} from "vue";
import {Howl} from 'howler';
import Clock from "./components/Clock.vue";
import Cassete from "./components/Cassete.vue";
import SaveStation from "./components/SaveStation.vue";
import {getRandomLofiVideoNoRepeat} from "./services/useLofiVideo.ts";

const lofiStations = ref();
const chillhopStations = ref();
const synthwaveStations = ref();
const jazzhopStations = ref();
const vaporwaveStations = ref();
const chillwaveStations = ref();
const retrowaveStations = ref();
const classicalStations = ref();
const currentlyPlaying = ref();

const cassettePlayer = ref();
const video = ref();

const volume = ref(1);

let stream: Howl;
// let stream = new Howl({
//   src: ["https://stream1-0nlineradio.radiohost.de/lo-fi?ref=radiobrowser"],
//   html5: true, // Needed for streaming in Tauri/WebView
//   volume: volume.value
// });



function play() {
  stream.play();
}

function pause() {
  stream.pause();
}

function updateVolume() {
  stream.volume(volume.value);
}

const togglePlayer = (toggle: boolean) => {
  if (toggle) {
    play();
  } else {
    pause();
  }
}

const backgroundVideo = ref('/videos/lofi-1.mp4');
const changeVideo = () => {
  backgroundVideo.value = `/videos/${getRandomLofiVideoNoRepeat()}`;
  video.value.load();
  video.value.play();

}
const onKeyDown = (event: KeyboardEvent) => {
  if (event.code === "Space") {
    event.preventDefault();
    cassettePlayer.value.toggleIsRunning()
    return
  }

  if (event.code === 'KeyG') {
    changeVideo();
    return;
  }

  if(event.code === 'KeyH'){
    const currentlyPlayingIndex = lofiStations.value.findIndex(station => station.stationuuid === currentlyPlaying.value.stationuuid)
    const nextStation = lofiStations.value[currentlyPlayingIndex + 1];
    if(nextStation){
      console.log('postoji next')
      currentlyPlaying.value = nextStation;
      createStream(currentlyPlaying.value)
    }else{
      console.log('ne postoji next')
      currentlyPlaying.value = lofiStations.value[0]
      createStream(currentlyPlaying.value)
    }
  }
}
const onWheel = (event: WheelEvent) => {
  if (event.deltaY < 0) {
    volume.value = Math.min(1, volume.value + 0.1);
  } else if (event.deltaY > 0) {
    volume.value = Math.max(0, volume.value - 0.1);
  }
  updateVolume();
};
onUnmounted(() => {
  stream.unload();
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("wheel", onWheel);
});
const stationsLoadingError = ref(false);
onMounted(async () => {
  const url = "http://de1.api.radio-browser.info/json/stations/bytag/lofi"
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.json();

    lofiStations.value = result;
    currentlyPlaying.value = lofiStations.value[0];
    createStream(currentlyPlaying.value)

  } catch (error) {
    stationsLoadingError.value = true;
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("wheel", onWheel);
})

const createStream = (station) => {
  currentlyPlaying.value = station;
  if(stream){
    stream.unload();
  }
  stream = new Howl({
    src: [station.url],
    html5: true,
    volume: volume.value
  });
  stream.play();

  stream.on('play', () => {
    currentlyPlaying.value = station;
  })
  stream.on('loaderror', function () {
    console.error('Stream failed to load');
    const currentlyPlayingIndex = lofiStations.value.findIndex(station => station.stationuuid === currentlyPlaying.value.stationuuid)
    console.log(currentlyPlayingIndex);
    lofiStations.value.splice(currentlyPlayingIndex, 1)
    const nextStation = lofiStations.value[currentlyPlayingIndex];
    createStream(nextStation);
  });

  stream.on('playerror', () => {
    console.error('Stream failed to load');
    const currentlyPlayingIndex = lofiStations.value.findIndex(station => station.stationuuid === currentlyPlaying.value.stationuuid)
    lofiStations.value.splice(currentlyPlayingIndex, 1)
    const nextStation = lofiStations.value[currentlyPlayingIndex];
    createStream(nextStation);
  })

}
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <video
        ref="video"
        autoplay
        muted
        loop
        playsinline
        class="fixed top-0 left-0 w-full h-full object-cover -z-10"
    >
      <source :src="backgroundVideo" type="video/mp4"/>
      Your browser does not support the video tag.
    </video>
    <div class="flex justify-between p-5 font-press-start">
      <div class="flex flex-col gap-5">
        <h1 class="flex items-center gap-3">
          Current station: {{ currentlyPlaying?.name}}
          <SaveStation/>
        </h1>
        <h2>
          Coming to you from: {{currentlyPlaying?.country	}}, {{ currentlyPlaying?.state	}}
        </h2>
      </div>
      <div>
        <Clock/>
      </div>
    </div>

    <div class="flex flex-col gap-2 fixed bottom-0 left-0 m-4">
      <Cassete ref="cassettePlayer" @toggle-player="togglePlayer"/>
    </div>
    <div class="flex flex-col gap-5 fixed bottom-0 right-0 m-4 items-center">
      <div :class="volume < 1 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="volume < 0.9 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="volume < 0.8 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="volume < 0.7 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="volume < 0.6 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="volume < 0.5 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="volume < 0.4 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="volume < 0.3 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="volume < 0.2 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="volume < 0.1 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
    </div>

  </div>
</template>
