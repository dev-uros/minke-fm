<script setup lang="ts">
import {onMounted, onUnmounted, ref} from "vue";

const time = ref('')

function updateTime() {
  time.value = new Date().toLocaleTimeString('sr-RS', {
    timeZone: 'Europe/Belgrade',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

let timer

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<template>
  <div class="text-white font-press-start text-2xl">
    {{ time }}
  </div>
</template>

<style scoped>

</style>