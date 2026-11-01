<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  toastTitle: string;
  toastMessage: string;
  duration?: number; // optional duration in ms
}

const props = defineProps<Props>();
const emit = defineEmits<{
  closeToast: []
}>()

watch(()=> props.toastTitle, (value) => {
  if(value){
    visible.value = true;
    setTimeout(() => {
      visible.value = false;
      emit('closeToast');
    }, props.duration ?? 3000);
  }
})

const visible = ref(false);


</script>

<template>
  <transition name="toast-fade">
    <div v-if="visible" class="modal-backdrop">
      <div class="card" @click.stop>
        <div class="head">{{ toastTitle }}</div>
        <div class="content">{{ toastMessage }}</div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* Toast fade transition */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.5s, transform 0.3s;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
.toast-fade-enter-to,
.toast-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  /* --safe-top is pushed in by the Android shell and is unset on desktop, where
     the calc falls back to the plain 20px. Without it the toast opens under the
     status bar. */
  padding-top: calc(var(--safe-top, 0px) + 20px);
  z-index: 9999;
  pointer-events: none; /* allow clicks through */
}

.card {
  pointer-events: auto; /* allow interacting with card itself */
  font-family: var(--m-font, Montserrat, sans-serif);
  width: auto;
  translate: -6px -6px;
  background: var(--m-card, rgb(242, 188, 0));
  border: var(--m-bw, 3px) solid var(--m-line, #000);
  box-shadow: var(--m-shadow-lg, 12px 12px 0 #000);
  overflow: hidden;
  transition: all 0.3s ease;
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
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--m-ink, black);
}
</style>
