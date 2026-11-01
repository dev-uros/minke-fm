<script setup lang="ts">
import PlayerIcon from "./PlayerIcon.vue";
import {PlayerEmits, PlayerProps} from "./types.ts";

/**
 * Pocket LCD skin: the lower half of a handheld. The screen above is the
 * phone's display panel in four shades of green; down here are a d-pad
 * (left/right tune, up the station list, down favourites), A and B, and two
 * pill keys.
 */
defineProps<PlayerProps>();
const emit = defineEmits<PlayerEmits>();
</script>

<template>
  <div class="lc-body">
    <button class="lc-strip" @click="emit('openGenres')">
      <span class="lc-genre">&#9834; {{ currentGenre }}</span>
      <span>{{ stationCount }} ch</span>
      <span v-if="shuffle">mix</span>
    </button>

    <div class="lc-pad-row">
      <div class="dpad">
        <button class="arm up" aria-label="Station list" @click="emit('openStations')">
          <PlayerIcon name="list" :size="16"/>
        </button>
        <button class="arm left" aria-label="Previous station" @click="emit('playPrevious')">
          <span class="tri"></span>
        </button>
        <span class="hub"></span>
        <button class="arm right" aria-label="Next station" @click="emit('playNext')">
          <span class="tri"></span>
        </button>
        <button class="arm down" aria-label="Favourites" @click="emit('openFavorites')">
          <PlayerIcon name="star" :size="16"/>
        </button>
      </div>

      <div class="ab">
        <div class="ab-key b">
          <button class="round" aria-label="Shuffle" :class="{ held: shuffle }" @click="emit('toggleShuffle')">B</button>
          <span class="tiny">mix</span>
        </div>
        <div class="ab-key a">
          <button class="round" :aria-label="isPlaying ? 'Pause' : 'Play'" @click="emit('togglePlayer', !isPlaying)">A</button>
          <span class="tiny">{{ isPlaying ? 'stop' : 'play' }}</span>
        </div>
      </div>
    </div>

    <div class="lc-bottom">
      <div class="pills">
        <div class="pill-wrap">
          <button class="lc-pill" aria-label="Switch genre" @click="emit('openGenres')"></button>
          <span class="tiny">genre</span>
        </div>
        <div class="pill-wrap">
          <button class="lc-pill" aria-label="Reload" @click="emit('resetAll')"></button>
          <span class="tiny">reload</span>
        </div>
      </div>
      <div class="speaker">
        <span v-for="n in 6" :key="n"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lc-body {
  --ink: #1e2416;
  --lcd: #c7d3a0;
  --case: #3b3f45;
  --key: #7a2e4a;
  width: 100%;
  padding: 4px 26px 6px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 18px;
  font-family: "Silkscreen", "Press Start 2P", monospace;
  color: #9aa0a6;
}

.lc-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 30px;
  padding: 0 10px;
  border: 3px solid #15171a;
  background: var(--lcd);
  color: var(--ink);
  font-family: inherit;
  font-size: 12px;
  text-transform: lowercase;
  box-shadow: inset 0 0 8px rgba(30, 36, 22, 0.3);
  cursor: pointer;
}

.lc-genre {
  flex: 1;
  min-width: 0;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lc-pad-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* ---- d-pad: a 3x3 grid with the corners left empty ---- */
.dpad {
  --s: 40px;
  display: grid;
  grid-template-columns: repeat(3, var(--s));
  grid-template-rows: repeat(3, var(--s));
  filter: drop-shadow(0 4px 0 #0d0e10);
}

.arm,
.hub {
  background: #17191c;
  border: none;
  color: #6b7178;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
}

.arm:active {
  background: #0b0c0e;
  color: var(--lcd);
}

.up {
  grid-area: 1 / 2;
  border-radius: 6px 6px 0 0;
}

.left {
  grid-area: 2 / 1;
  border-radius: 6px 0 0 6px;
}

.hub {
  grid-area: 2 / 2;
  background: radial-gradient(circle, #222529 40%, #17191c 42%);
}

.right {
  grid-area: 2 / 3;
  border-radius: 0 6px 6px 0;
}

.down {
  grid-area: 3 / 2;
  border-radius: 0 0 6px 6px;
}

.tri {
  width: 0;
  height: 0;
  border-top: 7px solid transparent;
  border-bottom: 7px solid transparent;
}

.left .tri {
  border-right: 10px solid currentColor;
}

.right .tri {
  border-left: 10px solid currentColor;
}

/* ---- A / B, set on a slant ---- */
.ab {
  display: flex;
  gap: 18px;
  transform: rotate(-24deg);
  padding: 10px 6px;
  border-radius: 40px;
  background: rgba(0, 0, 0, 0.18);
}

.ab-key {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.ab-key.a {
  margin-top: -18px;
}

.round {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: none;
  background: radial-gradient(circle at 35% 30%, #a2456a, var(--key) 60%, #521d31);
  color: rgba(255, 255, 255, 0.25);
  font-family: inherit;
  font-size: 14px;
  box-shadow: 0 4px 0 #2a0f1a;
  cursor: pointer;
}

.round:active,
.round.held {
  translate: 0 3px;
  box-shadow: 0 1px 0 #2a0f1a;
  filter: brightness(0.85);
}

.round.held {
  color: var(--lcd);
}

.tiny {
  font-size: 9px;
  text-transform: lowercase;
  letter-spacing: 1px;
  color: #8a9096;
}

/* ---- pills + speaker ---- */
/* The rotated pills swing their captions down and left; the padding keeps
   them inside the deck, which clips. */
.lc-bottom {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 0 22px 6px;
}

.pills {
  display: flex;
  gap: 18px;
  transform: rotate(-24deg);
  margin-left: 24px;
}

.pill-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.lc-pill {
  width: 46px;
  height: 13px;
  border-radius: 7px;
  border: none;
  background: #17191c;
  box-shadow: 0 2px 0 #0d0e10;
  cursor: pointer;
}

.lc-pill:active {
  translate: 0 2px;
  box-shadow: none;
}

.speaker {
  display: flex;
  gap: 7px;
  transform: rotate(-24deg);
  margin-right: 6px;
}

.speaker span {
  width: 6px;
  height: 44px;
  border-radius: 3px;
  background: #121416;
  box-shadow: inset 0 2px 2px rgba(0, 0, 0, 0.7);
}
</style>
