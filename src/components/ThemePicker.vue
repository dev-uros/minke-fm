<script setup lang="ts">
import {useEscapeToClose} from "../services/useEscapeToClose.ts";
import {SKINS, SkinId, useSkin} from "../services/useSkin.ts";

/**
 * The phone's theme chooser. A tap applies the skin straight away - the modal
 * itself restyles under your finger, which is the preview - and stays open so
 * the next one can be tried.
 */
const emit = defineEmits<{ closeModal: [] }>();
const closeModal = () => emit('closeModal');
useEscapeToClose(closeModal);

const {skin, setSkin} = useSkin();
const choose = (id: SkinId) => setSkin(id);
</script>

<template>
  <div class="modal-backdrop" @click="closeModal">
    <div class="card" @click.stop>
      <div class="head flex justify-between items-center">
        <span>Theme</span>
        <button @click="closeModal" class="btn btn-ghost btn-error btn-xs">X</button>
      </div>
      <div class="content">
        <button
            v-for="option in SKINS"
            :key="option.id"
            class="skin-row"
            :class="{ current: option.id === skin }"
            @click="choose(option.id)"
        >
          <span class="swatch" :style="{ background: option.swatch[0] }">
            <span :style="{ background: option.swatch[1] }"></span>
            <span :style="{ background: option.swatch[2] }"></span>
            <span :style="{ background: option.swatch[3] }"></span>
          </span>
          <span class="text">
            <span class="name">{{ option.name }}</span>
            <span class="blurb">{{ option.blurb }}</span>
          </span>
          <span class="tick">{{ option.id === skin ? '●' : '○' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Built on the same skeleton and variables as the other modals, so every
   skin's modal look applies here with no extra work. */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--m-backdrop, rgba(0, 0, 0, 0.3));
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.card {
  font-family: var(--m-font, Montserrat, sans-serif);
  width: min(380px, 90vw);
  background: var(--m-card, rgb(242, 188, 0));
  border: var(--m-bw, 3px) solid var(--m-line, #000);
  box-shadow: var(--m-shadow-lg, 12px 12px 0 #000);
  border-radius: var(--m-radius, 0);
  overflow: hidden;
  padding: 16px;
  transition: background 0.25s ease, border-radius 0.25s ease;
}

.head {
  font-size: 14px;
  font-weight: 900;
  height: 32px;
  padding: 5px 12px;
  background: var(--m-head, #ffffff);
  color: var(--m-head-fg, #000000);
  border-bottom: var(--m-bw, 3px) solid var(--m-line, #000);
}

.content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 2px 2px;
}

.skin-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px;
  text-align: left;
  background: var(--m-btn, rgb(241, 90, 37));
  color: var(--m-btn-fg, white);
  border: var(--m-bw, 3px) solid var(--m-line, #000);
  box-shadow: var(--m-shadow-sm, 3px 3px 0 #000);
  border-radius: var(--m-radius-sm, 0);
  cursor: pointer;
}

.skin-row.current {
  background: var(--m-btn-current, #252525);
}

.swatch {
  flex: none;
  width: 52px;
  height: 52px;
  border-radius: 6px;
  padding: 6px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 3px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
}

.swatch span {
  border-radius: 3px;
}

.swatch span:first-child {
  grid-column: 1 / 3;
}

.text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.name {
  font-size: 15px;
  font-weight: 900;
}

.blurb {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.75;
}

.tick {
  flex: none;
  font-size: 14px;
}
</style>
