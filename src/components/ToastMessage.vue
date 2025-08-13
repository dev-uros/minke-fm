<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import {StreamTypeEnum} from "../types";

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
  padding-top: 20px;
  z-index: 9999;
  pointer-events: none; /* allow clicks through */
}

.card {
  pointer-events: auto; /* allow interacting with card itself */
  font-family: Montserrat, sans-serif;
  width: auto;
  translate: -6px -6px;
  background: rgb(242, 188, 0);
  border: 3px solid #000000;
  box-shadow: 12px 12px 0 #000000;
  overflow: hidden;
  transition: all 0.3s ease;
}

.head {
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
  color: black;
}
</style>
