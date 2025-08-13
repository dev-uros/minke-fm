<script setup lang="ts">
import {ref} from "vue";
import GenreSwitcher from "./GenreSwitcher.vue";
import {FormattedStation, StreamTypeEnum} from "../types";

const emit = defineEmits<{
  togglePlayer: [toggle: boolean],
  playNext: [],
  playPrevious: [],
  setGenre: [genre: StreamTypeEnum],
  toggleShuffle: [],
  toggleFavoritesModal: [],
  reloadStations: [],
  openHelpModal: []
}>()

interface Props {
  currentlyPlaying: FormattedStation | null
  stationCount: number,
  shuffle: boolean
}

defineProps<Props>()

const isRunning = ref(true);


const toggleIsRunning = () => {
  isRunning.value = !isRunning.value

  emit('togglePlayer', isRunning.value);

}

defineExpose({
  toggleIsRunning
})
const switchGenreModal = ref(false);
const toggleSwitchGenreModal = () => {
  switchGenreModal.value = true;
}

const closeGenreSwitcherModal = () => {
  switchGenreModal.value = false;
}

const setGenre = (genre: StreamTypeEnum) => {
  switchGenreModal.value = false;
  emit("setGenre", genre)
}

const toggleShuffle = () => {
  emit('toggleShuffle');
}

const playPrevious = () => {
  isRunning.value = true
  emit('playPrevious')
}

const playNext = () => {
  isRunning.value = true

  emit('playNext')
}

const toggleFavoritesModal = () => {
  emit('toggleFavoritesModal')
}
const reloadStations = () => {
  emit('reloadStations');
}

const openHelpModal = () => {
  emit('openHelpModal')
}
</script>

<template>
  <div class="main">
    <div class="card">

      <div class="ups">
        <div class="screw1">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" @click="reloadStations">
            <!-- Icon from Google Material Icons by Material Design Authors - https://github.com/material-icons/material-icons/blob/master/LICENSE -->
            <path fill="currentColor"
                  d="M17.65 6.35a7.95 7.95 0 0 0-6.48-2.31c-3.67.37-6.69 3.35-7.1 7.02C3.52 15.91 7.27 20 12 20a7.98 7.98 0 0 0 7.21-4.56c.32-.67-.16-1.44-.9-1.44c-.37 0-.72.2-.88.53a5.994 5.994 0 0 1-6.8 3.31c-2.22-.49-4.01-2.3-4.48-4.52A6.002 6.002 0 0 1 12 6c1.66 0 3.14.69 4.22 1.78l-1.51 1.51c-.63.63-.19 1.71.7 1.71H19c.55 0 1-.45 1-1V6.41c0-.89-1.08-1.34-1.71-.71z"/>
          </svg>
        </div>
        <div class="screw1">
          <svg @click="openHelpModal" color="purple" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><!-- Icon from Solar by 480 Design - https://creativecommons.org/licenses/by/4.0/ --><path fill="currentColor" fill-rule="evenodd" d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2s10 4.477 10 10M12 7.75c-.621 0-1.125.504-1.125 1.125a.75.75 0 0 1-1.5 0a2.625 2.625 0 1 1 4.508 1.829q-.138.142-.264.267a7 7 0 0 0-.571.617c-.22.282-.298.489-.298.662V13a.75.75 0 0 1-1.5 0v-.75c0-.655.305-1.186.614-1.583c.229-.294.516-.58.75-.814q.106-.105.193-.194A1.125 1.125 0 0 0 12 7.75M12 17a1 1 0 1 0 0-2a1 1 0 0 0 0 2" clip-rule="evenodd"/></svg>
        </div>

        <div class="screw2">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
               @click="toggleFavoritesModal">
            <!-- Icon from Material Symbols Light by Google - https://github.com/google/material-design-icons/blob/master/LICENSE -->
            <path fill="currentColor"
                  d="M11.997 15.462q1.01 0 1.804-.617q.793-.616 1.16-1.549H9.04q.367.933 1.157 1.55q.79.615 1.8.615M9.89 11.924q.467 0 .789-.326q.322-.327.322-.794t-.327-.789t-.793-.322t-.789.327t-.322.793t.327.789t.793.322m4.231 0q.466 0 .789-.326q.322-.327.322-.794q0-.466-.327-.788q-.327-.323-.793-.323q-.467 0-.789.327t-.322.793t.327.789t.793.322m-5.995-4.83l2.608-3.472q.238-.32.566-.47Q11.627 3 12 3t.701.15t.566.471l2.608 3.471l4.02 1.368q.534.18.822.605q.289.426.289.94q0 .237-.07.471t-.228.449l-2.635 3.573l.1 3.83q.025.706-.466 1.189T16.564 20l-.454-.056L12 18.733l-4.11 1.211q-.124.05-.24.053q-.117.003-.214.003q-.665 0-1.15-.483t-.459-1.188l.1-3.856l-2.629-3.548q-.159-.217-.229-.453Q3 10.236 3 10q0-.506.297-.942q.296-.435.828-.618z"/>
          </svg>
        </div>
      </div>

      <div class="card1">
        <div class="flex flex-row gap-3 mt-1 justify-center">
          <button @click="playPrevious" class="btn btn-circle">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
              <!-- Icon from Tabler Icons by Paweł Kuna - https://github.com/tabler/tabler-icons/blob/master/LICENSE -->
              <path fill="currentColor"
                    d="m20.341 4.247l-8 7a1 1 0 0 0 0 1.506l8 7c.647.565 1.659.106 1.659-.753V5c0-.86-1.012-1.318-1.659-.753m-11 0l-8 7a1 1 0 0 0 0 1.506l8 7C9.988 20.318 11 19.859 11 19V5c0-.86-1.012-1.318-1.659-.753"/>
            </svg>
          </button>
          <button @click="toggleIsRunning" class="btn btn-circle">
            <svg v-show="isRunning" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
              <!-- Icon from Tabler Icons by Paweł Kuna - https://github.com/tabler/tabler-icons/blob/master/LICENSE -->
              <path fill="currentColor" d="M17 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3"/>
            </svg>
            <svg v-show="!isRunning" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
              <!-- Icon from Tabler Icons by Paweł Kuna - https://github.com/tabler/tabler-icons/blob/master/LICENSE -->
              <path fill="currentColor" d="M6 4v16a1 1 0 0 0 1.524.852l13-8a1 1 0 0 0 0-1.704l-13-8A1 1 0 0 0 6 4"/>
            </svg>
          </button>
          <button @click="playNext" class="btn btn-circle">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
              <!-- Icon from Tabler Icons by Paweł Kuna - https://github.com/tabler/tabler-icons/blob/master/LICENSE -->
              <path fill="currentColor"
                    d="M2 5v14c0 .86 1.012 1.318 1.659.753l8-7a1 1 0 0 0 0-1.506l-8-7C3.012 3.682 2 4.141 2 5m11 0v14c0 .86 1.012 1.318 1.659.753l8-7a1 1 0 0 0 0-1.506l-8-7C14.012 3.682 13 4.141 13 5"/>
            </svg>
          </button>
          <button class="btn btn-circle" @click="toggleShuffle">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48" v-if="shuffle">
              <!-- Icon from IconPark Outline by ByteDance - https://github.com/bytedance/IconPark/blob/master/LICENSE -->
              <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="4">
                <path stroke-linejoin="round" d="m40 33l4 4l-4 4m0-34l4 4l-4 4"/>
                <path d="M44 11h-7c-7.18 0-13 5.82-13 13s5.82 13 13 13h7M4 37h7c7.18 0 13-5.82 13-13s-5.82-13-13-13H4"/>
              </g>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 16 16" v-else>
              <!-- Icon from Fluent UI System Icons by Microsoft Corporation - https://github.com/microsoft/fluentui-system-icons/blob/main/LICENSE -->
              <path fill="currentColor"
                    d="m12 12.707l2.146 2.147a.5.5 0 0 0 .708-.708l-13-13a.5.5 0 1 0-.708.708l3.071 3.07A6 6 0 0 0 2.75 4.75a.75.75 0 0 0 0 1.5c1.243 0 2.122.432 2.932 1.082q.228-.217.477-.466l.707.707C5.65 8.786 4.606 9.75 2.75 9.75a.75.75 0 0 0 0 1.5c2.52 0 3.96-1.4 5.177-2.616l.707.707l-.39.387c.556.463 1.186.882 1.94 1.162l.859.86a.75.75 0 0 0 .957.957m-.992-3.82l2.458 2.458l.314-.315a.75.75 0 0 0 0-1.06l-1.5-1.5a.75.75 0 0 0-1.271.417M8.326 6.204l1.069 1.068c.58-.452 1.198-.791 1.963-.94l-.137.138a.75.75 0 0 0 1.06 1.06l1.5-1.5a.75.75 0 0 0 0-1.06l-1.5-1.5a.75.75 0 1 0-1.06 1.06l.265.265c-1.328.161-2.326.732-3.16 1.41"/>
            </svg>
          </button>
        </div>

        <div class="line1">
        </div>
        <div class="line2" @click="toggleSwitchGenreModal">
          <span class="line2-text text-2xl font-lofi" style="color: red">{{ currentlyPlaying?.type }} ({{
              stationCount
            }})</span>
        </div>

        <div class="yl">
          <div class="roll">
            <div class="s_wheel" :class="{ 'animate-run': isRunning }"></div>
            <div class="tape"></div>
            <div class="e_wheel" :class="{ 'animate-run': isRunning }"></div>
          </div>
        </div>
        <div class="or">
          <p class="time">2×30min</p>
        </div>
      </div>
      <div class="card2_main">
        <div class="card2">
          <div class="c1"></div>
          <div class="t1"></div>
          <div class="screw5">+</div>
          <div class="t2"></div>
          <div class="c2"></div>
        </div>
      </div>
      <div class="downs">
        <div class="screw3">+</div>
        <div class="screw4">+</div>
      </div>
    </div>
    <GenreSwitcher @set-genre="setGenre" @close-modal="closeGenreSwitcherModal" v-if="switchGenreModal"/>
  </div>
</template>

<style scoped>
.card {
  width: 300px;
  height: 200px;
  background: #252525;
  border-radius: 8px;
  box-shadow: rgba(0, 0, 0, 0.4) 0px 2px 4px, rgba(0, 0, 0, 0.3) 0px 7px 13px -3px, rgba(0, 0, 0, 0.2) 0px -3px 0px inset;
}

.ups {
  display: flex;
}

.screw1 {
  display: flex;
  color: black;
  border: 1px solid black;
  background-color: lightgrey;
  height: 2em;
  width: 2em;
  margin: 0.5em;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  cursor: pointer;

}

.screw2 {
  display: flex;
  color: yellow;
  border: 1px solid black;
  background-color: #1ac2ff;
  height: 2em;
  width: 2em;
  margin-top: 0.5em;
  margin-left: 10em;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
  cursor: pointer;

}

.downs {
  display: flex;
}

.screw3 {
  display: flex;
  color: black;
  border: 1px solid black;
  background-color: lightgrey;
  height: 0.75em;
  width: 0.75em;
  margin-top: -1.3em;
  margin-left: 0.5em;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
}

.screw4 {
  display: flex;
  color: black;
  border: 1px solid black;
  background-color: lightgrey;
  height: 0.75em;
  width: 0.75em;
  margin-top: -1.3em;
  margin-left: 16.35em;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
}

.card1 {
  width: 230px;
  height: 120px;
  margin-top: 0.5em;
  margin-left: 2.18em;
  background-color: #FFFDD0;
  clip-path: polygon(5% 0, 95% 0, 100% 10%, 100% 100%, 100% 100%, 0 100%, 0 100%, 0 10%);
  border-radius: 5px;
  position: relative;
}

.line1 {
  position: relative;
  width: 200px;
  height: 1px;
  background-color: black;
  top: 1em;
  left: 0.8em;
}

.line2 {
  position: relative;
  width: 270px;
  height: 1px;
  background-color: black;
  top: 2em;
  left: 0.8em;
}

.line2-text {
  position: absolute;
  top: -1.2em;
  left: 38%;
  transform: translateX(-50%);
  background-color: #f9f6f0; /* warm off-white */
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4" fill-opacity="0.1"><rect width="4" height="4" fill="black"/></svg>');
  background-repeat: repeat;
  padding: 0 0.3em;
  color: black;
  border-radius: 2px;
  box-shadow: inset 0 0 4px rgba(255 255 255 / 0.6), /* subtle light highlight */ 1px 1px 2px rgba(0 0 0 / 0.1); /* slight shadow for depth */
  user-select: none;
  -webkit-user-select: none; /* Safari */
  -moz-user-select: none; /* Firefox */
  -ms-user-select: none; /* IE10+ */
  cursor: pointer;
}

.yl {
  display: flex;
  width: 228px;
  height: 50px;
  background-color: rgb(242, 188, 0);
  margin-top: 2.5em;
  margin-left: 0.06em;
}

.roll {
  width: 8em;
  height: 2em;
  margin-left: 3em;
  border-radius: 15px;
  background-color: #171717;
  display: flex;
}

.tape {
  width: 3em;
  height: 1.5em;
  position: relative;
  left: 0.9em;
  background-color: #252525;
}

.s_wheel {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  top: 0.215em;
  left: 0.15em;
  width: 1.55em;
  height: 1.55em;
  border: 2px dashed #fff;
  box-shadow: 0 0 0 4.4px #fff;
  border-radius: 50%;
}

.window {
  background-color: white;
  width: auto;
  height: 2em;
}

.e_wheel {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  top: 0.215em;
  left: 1.7em;
  width: 1.55em;
  height: 1.55em;
  border: 2px dashed #fff;
  box-shadow: 0 0 0 4.4px #fff;
  border-radius: 50%;
}

.or {
  display: flex;
  width: 230px;
  height: 18px;
  background-color: rgb(241, 90, 37);
  margin-top: 0.4em;
  margin-left: 0em;
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  align-items: center;
  justify-content: center;
}

.time {
  font-size: 0.5em;
}

.card2_main {
  filter: drop-shadow(4px 4px 14px rgba(0, 0, 0, 1));
}

.card2 {
  width: 150px;
  height: 50px;
  margin-top: 0em;
  margin-left: 4.6em;
  background-color: #252525;
  clip-path: polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%);
}

.screw5 {
  position: relative;
  display: flex;
  color: black;
  border: 1px solid black;
  background-color: lightgrey;
  height: 0.75em;
  width: 0.75em;
  left: 4.25em;
  top: -0.5em;
  border-radius: 50%;
  align-items: center;
  justify-content: center;
}

.c1 {
  position: relative;
  width: 0.5em;
  height: 0.5em;
  background-color: rgb(190, 190, 190);
  border-radius: 50%;
  left: 1.5em;
  top: 2em;
}

.t1 {
  position: relative;
  width: 0.5em;
  height: 0.5em;
  background-color: rgb(190, 190, 190);
  border-radius: 2px;
  left: 3em;
  top: 1em;
}

.t2 {
  position: relative;
  width: 0.5em;
  height: 0.5em;
  background-color: rgb(190, 190, 190);
  border-radius: 2px;
  left: 5.7em;
  top: -0.2em;
}

.c2 {
  position: relative;
  width: 0.5em;
  height: 0.5em;
  background-color: rgb(190, 190, 190);
  border-radius: 50%;
  left: 7.2em;
  top: -0.2em;
}

.animate-run {
  animation: run 2s infinite linear;
}

@keyframes run {
  100% {
    transform: rotate(360deg);
  }
}
</style>