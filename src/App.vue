<script setup lang="ts">
import {onUnmounted, ref} from "vue";
import {Howl} from 'howler';



const volume = ref(1);

const stream = new Howl({
  src: ["https://0n-heavymetal.radionetz.de/0n-heavymetal.mp3"],
  html5: true, // Needed for streaming in Tauri/WebView
  format: ["mp3"],
  volume: volume.value
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

onUnmounted(() => {
  stream.unload(); // Cleanup when component is destroyed
});
</script>

<template>
  <div class="flex flex-col min-h-screen">
  </div>
<!--  <div class="radio-player">-->
<!--    <h1>🤘 Heavy Metal Radio</h1>-->
<!--    <button class="btn btn-info">Info</button>-->
<!--    <div class="controls">-->
<!--      <button @click="play">Play</button>-->
<!--      <button @click="pause">Pause</button>-->
<!--      <input-->
<!--          type="range"-->
<!--          min="0"-->
<!--          max="1"-->
<!--          step="0.01"-->
<!--          v-model="volume"-->
<!--          @input="updateVolume"-->
<!--      />-->
<!--    </div>-->
<!--    <progress class="progress progress-secondary w-56" value="100" max="100"></progress>-->
<!--  </div>-->
</template>
