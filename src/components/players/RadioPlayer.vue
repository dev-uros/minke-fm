<script setup lang="ts">
import {computed} from "vue";
import PlayerIcon from "./PlayerIcon.vue";
import {PlayerEmits, PlayerProps, positionOf} from "./types.ts";

/**
 * Transistor skin: a walnut cabinet with a backlit tuning dial. The needle
 * slides to a spot of its own for each station, the glass dims on pause, and
 * the piano keys along the bottom are the secondary actions.
 */
const props = defineProps<PlayerProps>();
const emit = defineEmits<PlayerEmits>();

// Kept off the very ends of the scale, where the needle would sit on the frame.
const needle = computed(() => 6 + positionOf(props.stationKey) * 88);

const SCALE = [88, 92, 96, 100, 104, 108];
</script>

<template>
  <div class="tr-radio">
    <button class="dial" :class="{ lit: isPlaying }" @click="emit('openGenres')">
      <span class="band">
        <span class="band-label">Band</span>
        <span class="band-name">{{ currentGenre }}</span>
        <span class="band-count">{{ stationCount }}</span>
      </span>
      <span class="scale">
        <span v-for="mark in SCALE" :key="mark">{{ mark }}</span>
      </span>
      <span class="ticks"></span>
      <span class="needle" :style="{ left: needle + '%' }"></span>
    </button>

    <div class="middle">
      <div class="grille">
        <span class="tr-badge">minke</span>
      </div>
      <div class="knobs">
        <button class="knob" aria-label="Previous station" @click="emit('playPrevious')">
          <PlayerIcon name="prev" :size="18"/>
        </button>
        <button class="knob big" :aria-label="isPlaying ? 'Pause' : 'Play'" @click="emit('togglePlayer', !isPlaying)">
          <PlayerIcon :name="isPlaying ? 'pause' : 'play'" :size="26"/>
        </button>
        <button class="knob" aria-label="Next station" @click="emit('playNext')">
          <PlayerIcon name="next" :size="18"/>
        </button>
      </div>
    </div>

    <div class="keys">
      <button class="key" @click="emit('openGenres')">Band</button>
      <button class="key" @click="emit('openStations')">List</button>
      <button class="key" @click="emit('openFavorites')">Fav</button>
      <button class="key" :class="{ down: shuffle }" @click="emit('toggleShuffle')">Mix</button>
      <button class="key" @click="emit('resetAll')">Reset</button>
    </div>
  </div>
</template>

<style scoped>
.tr-radio {
  width: calc(100% - 24px);
  margin: 0 12px 4px;
  padding: 14px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: 24px;
  border: 3px solid #140b05;
  background: repeating-linear-gradient(88deg, rgba(0, 0, 0, 0.08) 0 3px, transparent 3px 11px),
  repeating-linear-gradient(91deg, rgba(255, 220, 170, 0.05) 0 1px, transparent 1px 7px),
  linear-gradient(180deg, #8a5a33, #5e3a1e 60%, #4a2d16);
  box-shadow: inset 0 2px 0 rgba(255, 220, 170, 0.25), inset 0 -4px 0 rgba(0, 0, 0, 0.3), 0 10px 24px rgba(0, 0, 0, 0.5);
  font-family: "Zilla Slab", Georgia, serif;
}

/* ---- dial ---- */
.dial {
  position: relative;
  display: block;
  width: 100%;
  height: 92px;
  padding: 0;
  border: 3px solid #140b05;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  background: linear-gradient(180deg, #f7d58a, #e4a248);
  box-shadow: inset 0 0 0 3px #c9a46a, inset 0 0 22px rgba(120, 50, 0, 0.55);
  filter: brightness(0.72) saturate(0.8);
  transition: filter 0.6s ease;
}

.dial.lit {
  filter: none;
}

/* Glass glare across the top. */
.dial::after {
  content: "";
  position: absolute;
  inset: 0 0 55% 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.35), transparent);
  pointer-events: none;
}

.band {
  position: absolute;
  top: 7px;
  left: 12px;
  right: 12px;
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: #3a1d08;
  white-space: nowrap;
}

.band-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  opacity: 0.6;
}

.band-name {
  font-size: 18px;
  font-weight: 700;
  text-transform: capitalize;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.band-count {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  opacity: 0.6;
}

.scale {
  position: absolute;
  left: 6%;
  right: 6%;
  bottom: 30px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  color: #3a1d08;
}

.scale span {
  width: 0;
  display: flex;
  justify-content: center;
}

.ticks {
  position: absolute;
  left: 6%;
  right: 6%;
  bottom: 10px;
  height: 16px;
  background: repeating-linear-gradient(90deg, #3a1d08 0 1.5px, transparent 1.5px 4%),
  linear-gradient(#3a1d08, #3a1d08) bottom / 100% 1.5px no-repeat;
  -webkit-mask: linear-gradient(180deg, transparent 40%, #000 40%);
  mask: linear-gradient(180deg, transparent 40%, #000 40%);
}

.needle {
  position: absolute;
  top: 30px;
  bottom: 4px;
  width: 3px;
  margin-left: -1.5px;
  background: #c4210f;
  border-radius: 2px;
  box-shadow: 0 0 6px rgba(196, 33, 15, 0.7);
  transition: left 0.9s cubic-bezier(0.34, 1.4, 0.64, 1);
}

/* ---- grille + knobs ---- */
.middle {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.grille {
  position: relative;
  flex: 1;
  min-height: 92px;
  border-radius: 12px;
  border: 3px solid #140b05;
  background: radial-gradient(circle, #140b05 1.6px, transparent 2px) 0 0 / 8px 8px,
  linear-gradient(180deg, #3b2a1c, #2a1d12);
  box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tr-badge {
  padding: 2px 10px;
  border-radius: 999px;
  background: linear-gradient(180deg, #f1d38f, #b8893c);
  color: #3a1d08;
  font-size: 13px;
  font-weight: 700;
  font-style: italic;
  box-shadow: 0 1px 0 #140b05, inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.knobs {
  display: flex;
  align-items: center;
  gap: 10px;
}

.knob {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 3px solid #140b05;
  color: #2b1a0f;
  background: radial-gradient(circle at 35% 30%, #fff8e6, #e6d3a8 55%, #b89a63);
  box-shadow: 0 4px 0 #140b05, inset 0 -3px 6px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.knob.big {
  width: 68px;
  height: 68px;
  background: repeating-conic-gradient(rgba(0, 0, 0, 0.06) 0 6deg, transparent 6deg 12deg),
  radial-gradient(circle at 35% 30%, #fff8e6, #e6d3a8 55%, #b89a63);
}

.knob:active {
  translate: 0 3px;
  box-shadow: 0 1px 0 #140b05, inset 0 -3px 6px rgba(0, 0, 0, 0.2);
}

/* ---- piano keys ---- */
.keys {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 8px;
  background: #140b05;
}

.key {
  flex: 1;
  height: 40px;
  border-radius: 3px 3px 6px 6px;
  border: none;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #3a2414;
  background: linear-gradient(180deg, #fffaf0, #e8dcc2);
  box-shadow: inset 0 -6px 0 #cbb994;
  cursor: pointer;
  transition: box-shadow 0.12s ease, translate 0.12s ease;
}

.key:active,
.key.down {
  translate: 0 2px;
  box-shadow: inset 0 -2px 0 #cbb994;
  background: linear-gradient(180deg, #f2e2bf, #dccaa4);
}

.key.down {
  color: #a8321e;
}
</style>
