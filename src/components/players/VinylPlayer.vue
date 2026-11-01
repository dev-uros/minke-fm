<script setup lang="ts">
import PlayerIcon from "./PlayerIcon.vue";
import {PlayerEmits, PlayerProps} from "./types.ts";

/**
 * Turntable skin. The record turns while the stream plays and the tonearm
 * lifts off on pause; the label carries the genre and opens the genre picker.
 *
 * The spin is paused rather than removed, so the record stops where it is
 * instead of snapping back to the start.
 */
defineProps<PlayerProps>();
const emit = defineEmits<PlayerEmits>();
</script>

<template>
  <div class="vn-deck">
    <div class="vn-top">
      <div class="platter">
        <button class="record" :class="{ spinning: isPlaying }" aria-label="Play or pause"
                @click="emit('togglePlayer', !isPlaying)">
          <span class="grooves"></span>
          <span class="vn-label" @click.stop="emit('openGenres')">
            <span class="vn-label-genre">{{ currentGenre }}</span>
            <span class="vn-label-count">{{ stationCount }} stations</span>
          </span>
        </button>
        <span class="sheen"></span>
        <span class="spindle"></span>
        <div class="tonearm" :class="{ down: isPlaying }">
          <span class="pivot"></span>
          <span class="arm"><span class="headshell"></span></span>
        </div>
      </div>

      <div class="side">
        <button class="pin" @click="emit('openFavorites')">
          <PlayerIcon name="star" :size="18"/><span>Fav</span>
        </button>
        <button class="pin" @click="emit('openStations')">
          <PlayerIcon name="list" :size="18"/><span>List</span>
        </button>
        <button class="pin" :class="{ on: shuffle }" @click="emit('toggleShuffle')">
          <PlayerIcon name="shuffle" :size="18"/><span>Mix</span>
        </button>
        <button class="pin" @click="emit('resetAll')">
          <PlayerIcon name="reset" :size="18"/><span>Reset</span>
        </button>
      </div>
    </div>

    <div class="transport">
      <button class="pill" aria-label="Previous station" @click="emit('playPrevious')">
        <PlayerIcon name="prev" :size="18"/>
      </button>
      <button class="pill lead" @click="emit('togglePlayer', !isPlaying)">
        <PlayerIcon :name="isPlaying ? 'pause' : 'play'" :size="20"/>
        <span>{{ isPlaying ? 'Lift' : 'Drop' }}</span>
      </button>
      <button class="pill" aria-label="Next station" @click="emit('playNext')">
        <PlayerIcon name="next" :size="18"/>
      </button>
    </div>
  </div>
</template>

<style scoped>
.vn-deck {
  --gold: #c9a45c;
  width: calc(100% - 24px);
  margin: 0 12px 4px;
  padding: 14px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;
  border-radius: 10px;
  background: linear-gradient(160deg, #1d1d1d, #0e0e0e);
  border: 1px solid var(--gold);
  box-shadow: inset 0 0 0 4px #0e0e0e, inset 0 0 0 5px rgba(201, 164, 92, 0.35), 0 14px 30px rgba(0, 0, 0, 0.55);
  font-family: "Playfair Display", Georgia, serif;
  color: #f3ead2;
}

.vn-top {
  display: flex;
  gap: 14px;
  align-items: center;
}

/* ---- platter ---- */
.platter {
  position: relative;
  flex: none;
  width: min(56vw, 30vh, 260px);
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, #2a2a2a 68%, #3a3a3a 69%, #1a1a1a 71%);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.6);
}

.record {
  position: absolute;
  inset: 4%;
  padding: 0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  background: #0b0b0b;
  animation: spin 1.8s linear infinite;
  animation-play-state: paused;
}

.record.spinning {
  animation-play-state: running;
}

.grooves {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: repeating-radial-gradient(circle, #111 0 1px, #1c1c1c 1px 2.5px),
  radial-gradient(circle, transparent 30%, #0b0b0b 31%, #0b0b0b 33%, transparent 34%);
  -webkit-mask: radial-gradient(circle, transparent 34%, #000 34.5%, #000 97%, transparent 97.5%);
  mask: radial-gradient(circle, transparent 34%, #000 34.5%, #000 97%, transparent 97.5%);
}

/* Doesn't turn with the record - light falls on it from one side. */
.sheen {
  position: absolute;
  inset: 4%;
  border-radius: 50%;
  pointer-events: none;
  background: conic-gradient(from 20deg, transparent 0 30deg, rgba(255, 255, 255, 0.1) 45deg, transparent 60deg 210deg,
  rgba(255, 255, 255, 0.07) 225deg, transparent 240deg);
}

.vn-label {
  position: absolute;
  inset: 33%;
  border-radius: 50%;
  background: radial-gradient(circle, #e2c584, var(--gold) 60%, #a8843f);
  color: #2a1d08;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  text-align: center;
  overflow: hidden;
  box-shadow: inset 0 0 0 2px rgba(42, 29, 8, 0.25);
}

.vn-label-genre {
  max-width: 82%;
  font-size: 14px;
  font-weight: 700;
  font-style: italic;
  text-transform: capitalize;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: -14%;
}

.vn-label-count {
  font-size: 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
  opacity: 0.7;
}

.spindle {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 7px;
  height: 7px;
  margin: -3.5px 0 0 -3.5px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fff, #999);
  pointer-events: none;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ---- tonearm ----
   Pivots at the platter's top-right corner; resting it points straight down
   beside the record, and dropping swings the head onto the grooves. */
.tonearm {
  position: absolute;
  right: -6%;
  top: -2%;
  width: 18%;
  aspect-ratio: 1;
  pointer-events: none;
}

.pivot {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #f0dca8, var(--gold) 50%, #6b5222);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.6);
  z-index: 1;
}

.arm {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 7%;
  min-width: 4px;
  height: 380%;
  margin-left: -2px;
  background: linear-gradient(90deg, #8f8f8f, #e8e8e8, #8f8f8f);
  border-radius: 3px;
  transform-origin: 50% 0;
  transform: rotate(4deg);
  transition: transform 0.9s cubic-bezier(0.45, 0, 0.2, 1);
  box-shadow: 2px 3px 6px rgba(0, 0, 0, 0.5);
}

.tonearm.down .arm {
  transform: rotate(20deg);
}

.headshell {
  position: absolute;
  left: 50%;
  bottom: -14px;
  width: 14px;
  height: 20px;
  margin-left: -7px;
  border-radius: 3px;
  background: linear-gradient(180deg, #d8d8d8, #7a7a7a);
}

/* ---- side buttons ---- */
.side {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.pin {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(201, 164, 92, 0.6);
  background: linear-gradient(180deg, #1c1c1c, #121212);
  color: #f3ead2;
  font-family: inherit;
  font-size: 13px;
  font-style: italic;
  cursor: pointer;
}

.pin.on {
  color: #121212;
  background: var(--gold);
  border-color: var(--gold);
}

.pin:active {
  translate: 0 1px;
}

/* ---- transport ---- */
.transport {
  display: flex;
  gap: 10px;
}

.pill {
  flex: 1;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 999px;
  border: 1px solid var(--gold);
  background: linear-gradient(180deg, #2a2a2a, #161616);
  color: var(--gold);
  font-family: inherit;
  font-size: 15px;
  font-style: italic;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.pill.lead {
  flex: 1.6;
  color: #121212;
  background: linear-gradient(180deg, #e2c584, var(--gold) 55%, #a8843f);
}

.pill:active {
  translate: 0 1px;
  filter: brightness(0.9);
}
</style>
