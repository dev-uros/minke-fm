<script setup lang="ts">
import {computed} from "vue";
import PlayerIcon from "./PlayerIcon.vue";
import {PlayerEmits, PlayerProps, positionOf} from "./types.ts";

/**
 * Hi-fi skin: a nineties tuner faceplate. A glowing display with the band and
 * a spectrum that dances while playing (decorative - there is no audio
 * analysis in a native-player setup), an input knob for the genre, and rubber
 * transport keys with status LEDs.
 */
const props = defineProps<PlayerProps>();
const emit = defineEmits<PlayerEmits>();

const BARS = 18;
/** Each bar gets its own speed and delay so the dance doesn't look like a wave. */
const bars = Array.from({length: BARS}, (_, i) => ({
  duration: 0.45 + positionOf(`d${i}`) * 0.7,
  delay: -positionOf(`s${i}`) * 1.2,
  rest: 10 + positionOf(`r${i}`) * 18,
}));

/** The input knob turns to a position of its own for each genre. */
const knobAngle = computed(() => -135 + positionOf(props.currentGenre) * 270);

const channel = computed(() => String(props.stationCount).padStart(4, '0'));
</script>

<template>
  <div class="hf-plate">
    <div class="vfd" :class="{ live: isPlaying }">
      <div class="vfd-row">
        <span class="vfd-tag">Input</span>
        <span class="vfd-genre">{{ currentGenre }}</span>
        <span class="vfd-ch">CH {{ channel }}</span>
      </div>
      <div class="vfd-row">
        <span class="seg" :class="{ on: isPlaying }">Stereo</span>
        <span class="seg" :class="{ on: shuffle }">Shuffle</span>
        <span class="seg on">FM</span>
        <span class="spectrum">
          <span
              v-for="(bar, i) in bars"
              :key="i"
              class="bar"
              :style="{ animationDuration: bar.duration + 's', animationDelay: bar.delay + 's', height: bar.rest + '%' }"
          ></span>
        </span>
      </div>
    </div>

    <div class="hf-controls">
      <button class="hf-knob-wrap" @click="emit('openGenres')">
        <span class="hf-knob" :style="{ transform: `rotate(${knobAngle}deg)` }">
          <span class="hf-mark"></span>
        </span>
        <span class="caption">Input</span>
      </button>

      <div class="transport">
        <button class="rubber" @click="emit('playPrevious')">
          <PlayerIcon name="prev" :size="18"/>
          <span class="caption">Tune −</span>
        </button>
        <button class="rubber" @click="emit('togglePlayer', !isPlaying)">
          <span class="led" :class="{ on: isPlaying }"></span>
          <PlayerIcon :name="isPlaying ? 'pause' : 'play'" :size="20"/>
          <span class="caption">{{ isPlaying ? 'Pause' : 'Play' }}</span>
        </button>
        <button class="rubber" @click="emit('playNext')">
          <PlayerIcon name="next" :size="18"/>
          <span class="caption">Tune +</span>
        </button>
        <button class="rubber" @click="emit('toggleShuffle')">
          <span class="led amber" :class="{ on: shuffle }"></span>
          <PlayerIcon name="shuffle" :size="18"/>
          <span class="caption">Shuffle</span>
        </button>
      </div>
    </div>

    <div class="hf-bottom">
      <button class="slim" @click="emit('openFavorites')">Preset</button>
      <button class="slim" @click="emit('openStations')">Scan</button>
      <button class="slim" @click="emit('resetAll')">Reset</button>
      <span class="model">FM-90 · Stereo tuner</span>
    </div>
  </div>
</template>

<style scoped>
.hf-plate {
  --vfd: #5ff5d2;
  --amber: #ffb347;
  width: calc(100% - 24px);
  margin: 0 12px 4px;
  padding: 14px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;
  border-radius: 8px;
  border: 1px solid #34363b;
  background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.018) 0 1px, transparent 1px 3px),
  linear-gradient(180deg, #222428, #121315);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 14px 30px rgba(0, 0, 0, 0.7);
  font-family: "Orbitron", "VT323", sans-serif;
  color: #9aa1a8;
}

/* ---- display ---- */
.vfd {
  padding: 10px 12px;
  border-radius: 4px;
  background: radial-gradient(ellipse at 50% 40%, #072520, #020a08 85%);
  border: 1px solid #000;
  box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.9), 0 1px 0 rgba(255, 255, 255, 0.06);
  font-family: "VT323", monospace;
  color: var(--vfd);
  text-shadow: 0 0 6px rgba(95, 245, 210, 0.6);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vfd-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.vfd-tag {
  font-size: 13px;
  opacity: 0.55;
  text-transform: uppercase;
}

.vfd-genre {
  flex: 1;
  min-width: 0;
  font-size: 30px;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vfd-ch {
  font-size: 18px;
  color: var(--amber);
  text-shadow: 0 0 6px rgba(255, 179, 71, 0.6);
}

/* Segments that are present but unlit, as on a real display. */
.seg {
  font-size: 13px;
  padding: 0 4px;
  border: 1px solid currentColor;
  border-radius: 2px;
  text-transform: uppercase;
  opacity: 0.15;
  text-shadow: none;
}

.seg.on {
  opacity: 1;
  text-shadow: 0 0 6px rgba(95, 245, 210, 0.6);
}

.spectrum {
  flex: 1;
  height: 26px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 2px;
}

.bar {
  width: 4px;
  background: repeating-linear-gradient(to top, var(--vfd) 0 2px, transparent 2px 3px);
  box-shadow: 0 0 4px rgba(95, 245, 210, 0.4);
  opacity: 0.35;
}

.vfd.live .bar {
  opacity: 1;
  animation-name: dance;
  animation-iteration-count: infinite;
  animation-direction: alternate;
  animation-timing-function: ease-in-out;
}

@keyframes dance {
  0% {
    height: 15%;
  }
  40% {
    height: 85%;
  }
  70% {
    height: 40%;
  }
  100% {
    height: 100%;
  }
}

/* ---- controls ---- */
.hf-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hf-knob-wrap {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
}

.hf-knob {
  position: relative;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: repeating-conic-gradient(rgba(255, 255, 255, 0.05) 0 3deg, transparent 3deg 6deg),
  radial-gradient(circle at 50% 50%, #cfd3d8, #8d9298 60%, #5d6167);
  box-shadow: 0 0 0 4px #0c0d0e, 0 0 0 5px #3a3c41, 0 6px 12px rgba(0, 0, 0, 0.7), inset 0 2px 2px rgba(255, 255, 255, 0.5);
  transition: transform 0.7s cubic-bezier(0.34, 1.3, 0.64, 1);
}

.hf-mark {
  position: absolute;
  left: 50%;
  top: 8px;
  width: 4px;
  height: 16px;
  margin-left: -2px;
  border-radius: 2px;
  background: var(--amber);
  box-shadow: 0 0 6px var(--amber);
}

.caption {
  font-family: "Orbitron", sans-serif;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #7c838a;
}

.transport {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.rubber {
  position: relative;
  height: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border-radius: 6px;
  border: 1px solid #000;
  background: linear-gradient(180deg, #2e3035, #1b1c1f);
  color: #d5dade;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 3px 0 #050506;
  cursor: pointer;
}

.rubber:active {
  translate: 0 2px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 1px 0 #050506;
}

.led {
  position: absolute;
  top: 6px;
  left: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #0d2a24;
}

.led.on {
  background: var(--vfd);
  box-shadow: 0 0 6px var(--vfd);
}

.led.amber {
  background: #3a2810;
}

.led.amber.on {
  background: var(--amber);
  box-shadow: 0 0 6px var(--amber);
}

/* ---- bottom strip ---- */
.hf-bottom {
  display: flex;
  align-items: center;
  gap: 6px;
}

.slim {
  height: 26px;
  padding: 0 10px;
  border-radius: 13px;
  border: 1px solid #000;
  background: linear-gradient(180deg, #2a2c30, #18191c);
  color: #b9c0c6;
  font-family: "Orbitron", sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 2px 0 #050506;
}

.slim:active {
  translate: 0 1px;
  box-shadow: none;
}

.model {
  margin-left: auto;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #5c6268;
  white-space: nowrap;
}
</style>
