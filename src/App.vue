<script setup lang="ts">
import {onMounted, onUnmounted, ref} from "vue";
import Clock from "./components/Clock.vue";
import Cassete from "./components/Cassete.vue";
import StreamLoading from "./components/StreamLoading.vue";
import SaveStation from "./components/SaveStation.vue";
import {getRandomLofiVideoNoRepeat} from "./services/useLofiVideo.ts";

import {useStream} from "./services/useStream.ts";
import {StreamTypeEnum} from "./types";
import {getRandomSynthwaveVideoNoRepeat} from "./services/useSynthwaveVideo.ts";

const {
  currentlyPlaying,
  streamVolume,
  stationsCount,
  streamLoading,
  getStations,
  toggleStream,
  unload,
  playNextStation,
  changeGenre
} = useStream();


const cassettePlayer = ref();
const togglePlayer = () => {
  toggleStream();
}

const setGenre = (genre: StreamTypeEnum) => {
  changeGenre(genre);

  if([StreamTypeEnum.LOFI, StreamTypeEnum.CHILLWAVE, StreamTypeEnum.CHILLHOP].includes(genre)){
    backgroundVideo.value = `/videos/${getRandomLofiVideoNoRepeat()}`;
    video.value.load();
    video.value.play();
    return
  }


  if([StreamTypeEnum.SYNTHWAVE, StreamTypeEnum.RETROWAVE, StreamTypeEnum.VAPORWAVE].includes(genre)){
    backgroundVideo.value = `/videos/${getRandomSynthwaveVideoNoRepeat()}`;
    video.value.load();
    video.value.play();
    return
  }
}
const video = ref();


const backgroundVideo = ref('/videos/lofi-1.mp4');
const changeVideo = () => {
  if([StreamTypeEnum.LOFI, StreamTypeEnum.CHILLWAVE, StreamTypeEnum.CHILLHOP].includes(currentlyPlaying.value!.type)){
    backgroundVideo.value = `/videos/${getRandomLofiVideoNoRepeat()}`;
    video.value.load();
    video.value.play();
    return
  }


  if([StreamTypeEnum.SYNTHWAVE, StreamTypeEnum.RETROWAVE, StreamTypeEnum.VAPORWAVE].includes(currentlyPlaying.value!.type)){
    backgroundVideo.value = `/videos/${getRandomSynthwaveVideoNoRepeat()}`;
    video.value.load();
    video.value.play();
    return
  }
}
const onKeyDown = (event: KeyboardEvent) => {
  if (event.code === "Space") {
    event.preventDefault();
    if(!streamLoading.value){
      cassettePlayer.value.toggleIsRunning()
    }
    return
  }

  if (event.code === 'KeyG') {
    changeVideo();
    return;
  }

  if (event.code === 'KeyH') {
    if(!streamLoading.value){
      playNextStation();
    }
  }
}
const onWheel = (event: WheelEvent) => {
  if (event.deltaY < 0) {
    streamVolume.value = Math.min(1, streamVolume.value + 0.1);
  } else if (event.deltaY > 0) {
    streamVolume.value = Math.max(0, streamVolume.value - 0.1);
  }
};
onUnmounted(() => {
  unload();
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("wheel", onWheel);
});
const stationsLoadingError = ref(false);
onMounted(async () => {

  try {
    await getStations();
  } catch (error) {
    stationsLoadingError.value = true;
  }
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
      <div class="flex flex-col gap-5" >
        <h1 v-if="!streamLoading" class="flex items-center gap-3">
          Current station: {{ currentlyPlaying?.name }}
          <SaveStation/>
        </h1>
        <h2 v-if="!streamLoading">
          Coming to you from: {{ currentlyPlaying?.country }}, {{ currentlyPlaying?.state }}
        </h2>

        <StreamLoading v-if="streamLoading"/>
      </div>
      <div>
        <Clock/>
      </div>
    </div>

    <div class="flex flex-col gap-2 fixed bottom-0 left-0 m-4">
      <Cassete @set-genre="setGenre" :station-count="stationsCount" :currently-playing="currentlyPlaying" ref="cassettePlayer" @toggle-player="togglePlayer"/>
    </div>
    <div class="flex flex-col gap-5 fixed bottom-0 right-0 m-4 items-center">
      <div :class="streamVolume < 1 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="streamVolume < 0.9 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="streamVolume < 0.8 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="streamVolume < 0.7 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="streamVolume < 0.6 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="streamVolume < 0.5 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="streamVolume < 0.4 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="streamVolume < 0.3 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="streamVolume < 0.2 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="streamVolume < 0.1 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
    </div>

  </div>
</template>
