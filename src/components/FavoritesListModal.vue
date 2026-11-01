<script setup lang="ts">
import {FormattedStation} from "../types";
import {useRememberedScroll} from "../services/useRememberedScroll.ts";
import {useEscapeToClose} from "../services/useEscapeToClose.ts";
interface Props {
  favoriteStations: FormattedStation[]
}

defineProps<Props>()
const emit = defineEmits<{
  closeModal: [],
  setStation: [station: FormattedStation],
  removeStation: [station: FormattedStation]
}>()

const {container} = useRememberedScroll(() => 'favorites');

const closeModal = () => {
  emit('closeModal');
}

useEscapeToClose(closeModal);

const setStation = (station: FormattedStation) => {
  emit('setStation', station);
}
const removeStation = (station: FormattedStation) => {
  emit('removeStation', station);
}
</script>

<template>
  <div class="modal-backdrop" @click="closeModal">
    <div class="card" @click.stop>
      <div class="head flex justify-between items-center">
        <span>Favorite stations</span>
        <button @click="closeModal" class="btn btn-ghost btn-error btn-xs">X</button>
      </div>
      <div class="content flex flex-col gap-3" ref="container">
        <div
            v-for="station in favoriteStations"
            :key="station.id"
            class="flex items-center gap-2"
        >
          <button
              class="button flex-1"
              @click="setStation(station)"
          >
            {{ station.name }}
          </button>

          <button
              class="delete-button"
              @click.stop="removeStation(station)"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0; /* top:0; right:0; bottom:0; left:0 */
  background: var(--m-backdrop, rgba(0, 0, 0, 0.3)); /* semi-transparent black */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999; /* ensure it appears above other content */
}

.card {
  font-family: var(--m-font, Montserrat, sans-serif);
  translate: -6px -6px;
  background: var(--m-card, rgb(242, 188, 0));
  border: var(--m-bw, 3px) solid var(--m-line, #000);
  box-shadow: var(--m-shadow-lg, 12px 12px 0 #000);
  overflow: hidden;
  transition: all 0.3s ease;
  padding: 20px;
  border-radius: var(--m-radius, 0);
}

.head {
  font-family: var(--m-font, Montserrat, sans-serif);
  font-size: 14px;
  font-weight: 900;
  width: 100%;
  height: 32px;
  background: var(--m-head, #ffffff);
  padding: 5px 12px;
  color: var(--m-head-fg, #000000);
  border-bottom: var(--m-bw, 3px) solid var(--m-line, #000);
}

.content {
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  max-height: 300px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.button {
  padding: 5px 10px;
  margin-top: 10px;
  border: var(--m-bw, 3px) solid var(--m-line, #000);
  box-shadow: var(--m-shadow-sm, 3px 3px 0 #000);
  font-weight: 750;
  background: var(--m-btn, rgb(241, 90, 37));
  transition: all 0.3s ease;
  cursor: pointer;
  color: var(--m-btn-fg, white);
  border-radius: var(--m-radius-sm, 0);
}

.button:hover {
  translate: 1.5px 1.5px;
  box-shadow: var(--m-shadow-sm, 1.5px 1.5px 0 #000);
  background: var(--m-btn-hover, #1ac2ff);
}

.button:active {
  translate: 3px 3px;
  box-shadow: 0 0 0 #000000;
}

.card:hover {
  translate: -6px;
}

.delete-button {
  padding: 5px 10px;
  margin-top: 10px;
  border: var(--m-bw, 3px) solid var(--m-line, #000);
  box-shadow: var(--m-shadow-sm, 3px 3px 0 #000);
  font-weight: 750;
  background: var(--m-danger, red);
  transition: all 0.3s ease;
  cursor: pointer;
  color: var(--m-btn-fg, white);
  border-radius: var(--m-radius-sm, 0);
}

.delete-button:hover {
  translate: 1.5px 1.5px;
  box-shadow: var(--m-shadow-sm, 1.5px 1.5px 0 #000);
  background: var(--m-btn-hover, #1ac2ff);
}

.delete-button:active {
  translate: 3px 3px;
  box-shadow: 0 0 0 #000000;
}
</style>