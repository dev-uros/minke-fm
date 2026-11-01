<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, watch} from "vue";
import type {Backdrop} from "../backdrops";
import type {Frame} from "../backdrops/pixel";

const props = defineProps<{ backdrop: Backdrop }>();

/** Pixel height of the drawing; CSS scales it up with nearest-neighbour. */
const HEIGHT = 180;
/** 30fps is plenty for pixel art and halves the work of 60. */
const FRAME_MS = 1000 / 30;

const el = ref<HTMLCanvasElement>();
let ctx: CanvasRenderingContext2D | null = null;
let draw: Frame | null = null;
let raf = 0;
let lastFrame = 0;
const start = performance.now();

const build = () => {
  const c = el.value;
  if (!c) return;
  c.height = HEIGHT;
  c.width = Math.round(HEIGHT * (window.innerWidth / Math.max(1, window.innerHeight)));
  ctx = c.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  draw = props.backdrop.create(c.width, c.height);
};

const loop = (now: number) => {
  raf = requestAnimationFrame(loop);
  // Closing the window only hides it, so stop painting while nobody looks.
  if (document.hidden || !ctx || !draw) return;
  if (now - lastFrame < FRAME_MS - 2) return;
  lastFrame = now;
  const t = (now - start) / 1000;
  draw(ctx, t, (t * props.backdrop.bpm) / 60);
};

let resizeTimer: ReturnType<typeof setTimeout> | undefined;
const onResize = () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(build, 150);
};

watch(() => props.backdrop, build);

onMounted(() => {
  build();
  raf = requestAnimationFrame(loop);
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  clearTimeout(resizeTimer);
  window.removeEventListener('resize', onResize);
});
</script>

<template>
  <canvas ref="el" class="backdrop-canvas"></canvas>
</template>

<style scoped>
.backdrop-canvas {
  image-rendering: pixelated;
}
</style>
