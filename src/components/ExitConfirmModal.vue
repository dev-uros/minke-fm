<script setup lang="ts">
import {useEscapeToClose} from "../services/useEscapeToClose.ts";

/**
 * The "are you sure" shown when back is pressed twice with nothing open.
 *
 * It registers with the shared dismiss stack like every other modal, so a third
 * back press dismisses the question rather than leaving - the app is only ever
 * closed by choosing to.
 */

const emit = defineEmits<{
  closeModal: [],
  confirm: [],
}>();

const closeModal = () => emit('closeModal');

useEscapeToClose(closeModal);
</script>

<template>
  <div class="modal-backdrop" @click="closeModal">
    <div class="card" @click.stop>
      <div class="head flex justify-between items-center">
        <span>Hold on</span>
        <button @click="closeModal" class="btn btn-ghost btn-error btn-xs">X</button>
      </div>
      <div class="content">
        <p class="ask">Close minke fm?</p>
        <p class="note">Playback stops.</p>
        <div class="row">
          <button class="button stay" @click="closeModal">Stay</button>
          <button class="button leave" @click="emit('confirm')">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--m-backdrop, rgba(0, 0, 0, 0.45));
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000; /* above every other modal - it is the last word */
}

.card {
  font-family: var(--m-font, Montserrat, sans-serif);
  width: min(300px, 82vw);
  translate: -6px -6px;
  background: var(--m-card, rgb(242, 188, 0));
  border: var(--m-bw, 3px) solid var(--m-line, #000);
  box-shadow: var(--m-shadow-lg, 12px 12px 0 #000);
  overflow: hidden;
  border-radius: var(--m-radius, 0);
}

.head {
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
  padding: 14px 12px 16px;
  color: var(--m-ink, #000000);
}

.ask {
  margin: 0;
  font-size: 16px;
  font-weight: 900;
}

.note {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.7;
}

.row {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.button {
  flex: 1;
  padding: 9px 10px;
  border: var(--m-bw, 3px) solid var(--m-line, #000);
  box-shadow: var(--m-shadow-sm, 3px 3px 0 #000);
  font-weight: 750;
  font-size: 14px;
  color: var(--m-btn-fg, #ffffff);
  cursor: pointer;
  border-radius: var(--m-radius-sm, 0);
}

.stay {
  background: var(--m-btn-hover, #1ac2ff);
}

.leave {
  background: var(--m-btn, rgb(241, 90, 37));
}

.button:active {
  translate: 3px 3px;
  box-shadow: 0 0 0 #000000;
}
</style>
