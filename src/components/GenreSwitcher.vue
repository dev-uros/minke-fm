<script setup lang="ts">
import {StreamTypeEnum} from "../types";

const emit = defineEmits<{
  closeModal: [],
  setGenre: [genre: StreamTypeEnum]
}>()

const closeModal = () => {
  emit('closeModal');
}

const setGenre = (genre: StreamTypeEnum) => {
  emit('setGenre', genre);

}
</script>

<template>
  <div class="modal-backdrop" @click="closeModal">
    <div class="card" @click.stop>
      <div class="head flex justify-between items-center">
        <span>Hotkeys</span>
        <button @click="closeModal" class="btn btn-ghost btn-error btn-xs">X</button>
      </div>
      <div class="content flex flex-col gap-3">
        <button class="button" @click="setGenre(StreamTypeEnum.LOFI)">LoFi</button>
        <button class="button" @click="setGenre(StreamTypeEnum.CHILLHOP)">ChillHop</button>
        <button class="button" @click="setGenre(StreamTypeEnum.SYNTHWAVE)">SynthWave</button>
        <button class="button" @click="setGenre(StreamTypeEnum.JAZZHOP)">JazzHop</button>
        <button class="button" @click="setGenre(StreamTypeEnum.VAPORWAVE)">VaporWave</button>
        <button class="button" @click="setGenre(StreamTypeEnum.RETROWAVE)">RetroWave</button>

      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0; /* top:0; right:0; bottom:0; left:0 */
  background: rgba(0, 0, 0, 0.3); /* semi-transparent black */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999; /* ensure it appears above other content */
}

.card {
  font-family: Montserrat, sans-serif;
  width: 300px;
  translate: -6px -6px;
  background: rgb(242, 188, 0);
  border: 3px solid #000000;
  box-shadow: 12px 12px 0 #000000;
  overflow: hidden;
  transition: all 0.3s ease;
}

.head {
  font-family: Montserrat, sans-serif;
  font-size: 14px;
  font-weight: 900;
  width: 100%;
  height: 32px;
  background: #ffffff;
  padding: 5px 12px;
  color: #000000;
  border-bottom: 3px solid #000000;
}

.content {
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
}

.button {
  padding: 5px 10px;
  margin-top: 10px;
  border: 3px solid #000000;
  box-shadow: 3px 3px 0 #000000;
  font-weight: 750;
  background: rgb(241, 90, 37);
  transition: all 0.3s ease;
  cursor: pointer;
  color: white;
}

.button:hover {
  translate: 1.5px 1.5px;
  box-shadow: 1.5px 1.5px 0 #000000;
  background: #1ac2ff;
}

.button:active {
  translate: 3px 3px;
  box-shadow: 0 0 0 #000000;
}

.card:hover {
  translate: -6px;
}

</style>