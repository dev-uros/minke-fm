<script setup lang="ts">
import {onMounted, onUnmounted, ref} from "vue";
import {Howl} from 'howler';
import Clock from "./components/Clock.vue";
import Cassete from "./components/Cassete.vue";
import SaveStation from "./components/SaveStation.vue";

const cassettePlayer = ref();
const video = ref();

const volume = ref(1);

const stream = new Howl({
  src: ["https://stream1-0nlineradio.radiohost.de/lo-fi?ref=radiobrowser"],
  html5: true, // Needed for streaming in Tauri/WebView
  volume: volume.value
});

stream.on('loaderror', function () {
  console.error('Stream failed to load');
  // Handle the error, e.g., show a message to the user or retry
});

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
  if(backgroundVideo.value === '/videos/lofi-1.mp4'){
    backgroundVideo.value = '/videos/lofi-2.mp4'
    video.value.load();
    video.value.play();
  }else{
    backgroundVideo.value = '/videos/lofi-1.mp4'
    video.value.load();
    video.value.play();
  }
}
const onKeyDown = (event: KeyboardEvent) => {
  if (event.code === "Space") {
    event.preventDefault();
    cassettePlayer.value.toggleIsRunning()
    return
  }

  if (event.code === 'KeyG') {
    console.log('G je?');
    changeVideo();
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

onMounted(() => {
  play();
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("wheel", onWheel);
})
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
          Current station: Nightwave Plaza
          <SaveStation/>
        </h1>
        <h2>
          Coming to you from: Germany, Bavaria
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
