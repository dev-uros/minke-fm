<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from "vue";
import {emit, listen, UnlistenFn} from "@tauri-apps/api/event";
import {invoke} from "@tauri-apps/api/core";

/**
 * The panel that drops out of the menu bar icon.
 *
 * Its own window, so it shares nothing with the player. It reads state pushed
 * from the main window and sends back actions; it never decides anything about
 * playback itself.
 */

interface TrayState {
  station: string | null;
  track: string | null;
  artist: string | null;
  song: string | null;
  artwork: string | null;
  genre: string;
  playing: boolean;
  shuffle: boolean;
  favourite: boolean;
}

const state = ref<TrayState>({
  station: null, track: null, artist: null, song: null, artwork: null,
  genre: '', playing: false, shuffle: false, favourite: false
});

const unlisteners: UnlistenFn[] = [];

onMounted(async () => {
  // Whatever happened while the panel was closed has to be caught up on.
  try {
    state.value = await invoke<TrayState>('tray_state');
  } catch {
    // Nothing reported yet - the defaults above read as "not playing".
  }
  void listen<TrayState>('tray:state', event => {
    state.value = event.payload;
  }).then(un => unlisteners.push(un));
});

onUnmounted(() => {
  while (unlisteners.length) unlisteners.pop()!();
});

/** Playback goes to the main window, which owns the player. */
const act = (action: string) => void emit('tray:action', action);
/** Window and lifecycle are Rust's to handle. */
const command = (action: string) => void invoke('tray_command', {action});

/** Station name is the fallback headline when no track was announced. */
const headline = computed(() => state.value.song ?? state.value.station ?? 'Not playing');
const subline = computed(() =>
    state.value.song ? state.value.artist : (state.value.station ? state.value.genre : null)
);

/**
 * The station gets its own line whenever a track has taken over the headline.
 * Saving a favourite saves the *station*, so which one it is has to be on
 * screen next to that button - otherwise you are starring something unnamed.
 * When there is no track the headline already is the station, and repeating it
 * would just be noise.
 */
const stationLine = computed(() => (state.value.song ? state.value.station : null));
</script>

<template>
  <div class="panel">
    <div class="sleeve" :class="{ empty: !state.artwork }">
      <img v-if="state.artwork" :src="state.artwork" alt=""/>
      <span v-else>&#9834;</span>
    </div>

    <div class="labels">
      <p class="headline" :title="headline">{{ headline }}</p>
      <p v-if="subline" class="subline" :title="subline">{{ subline }}</p>
    </div>

    <div class="transport">
      <button class="round" title="Previous station" @click="act('previous')">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor"
                d="m20.341 4.247l-8 7a1 1 0 0 0 0 1.506l8 7c.647.565 1.659.106 1.659-.753V5c0-.86-1.012-1.318-1.659-.753m-11 0l-8 7a1 1 0 0 0 0 1.506l8 7C9.988 20.318 11 19.859 11 19V5c0-.86-1.012-1.318-1.659-.753"/>
        </svg>
      </button>

      <button class="round big" :title="state.playing ? 'Pause' : 'Play'" @click="act('play-pause')">
        <svg v-if="state.playing" viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M17 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M6 4v16a1 1 0 0 0 1.524.852l13-8a1 1 0 0 0 0-1.704l-13-8A1 1 0 0 0 6 4"/>
        </svg>
      </button>

      <button class="round" title="Next station" @click="act('next')">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor"
                d="M2 5v14c0 .86 1.012 1.318 1.659.753l8-7a1 1 0 0 0 0-1.506l-8-7C3.012 3.682 2 4.141 2 5m11 0v14c0 .86 1.012 1.318 1.659.753l8-7a1 1 0 0 0 0-1.506l-8-7C14.012 3.682 13 4.141 13 5"/>
        </svg>
      </button>
    </div>

    <p v-if="stationLine" class="station" :title="stationLine">
      <span class="dot"></span><span class="station-name">{{ stationLine }}</span>
    </p>

    <div class="toggles">
      <button class="chip" :class="{ on: state.shuffle }" @click="act('shuffle')">Shuffle</button>
      <button class="chip" :class="{ on: state.favourite }" :disabled="!state.station"
              @click="act('favourite')">
        {{ state.favourite ? '★ Saved' : '☆ Save' }}
      </button>
    </div>

    <div class="footer">
      <button class="link" @click="command('show')">Open MinkeFM</button>
      <button class="link quit" @click="command('quit')">Quit</button>
    </div>
  </div>
</template>

<style>
/* Both windows load one bundle, so this block is NOT scoped by Vue and would
   otherwise apply everywhere - a dark body in the main window sits on top of
   the backdrop video, which lives at z-index -10, and hides it completely.
   The class is set in main.ts and only ever lands on the panel's document. */
.is-tray-panel,
.is-tray-panel body,
.is-tray-panel #app {
  margin: 0;
  height: 100%;
  overflow: hidden;
  background: #252525;
}
</style>

<style scoped>
.panel {
  height: 100%;
  box-sizing: border-box;
  padding: 16px 16px 12px;
  background: #252525;
  border: 3px solid #000;
  font-family: Montserrat, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  user-select: none;
  -webkit-user-select: none;
}

.sleeve {
  width: 132px;
  height: 132px;
  flex: none;
  border: 3px solid #000;
  box-shadow: 5px 5px 0 #000;
  background: #171717;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.sleeve img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sleeve.empty {
  color: rgb(242, 188, 0);
  font-size: 46px;
}

.labels {
  width: 100%;
  text-align: center;
  min-width: 0;
}

.headline {
  font-size: 13px;
  font-weight: 900;
  color: #FFFDD0;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.subline {
  font-size: 11px;
  font-weight: 700;
  color: rgb(241, 90, 37);
  margin: 3px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.transport {
  display: flex;
  align-items: center;
  gap: 14px;
}

.round {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 3px solid #000;
  box-shadow: 3px 3px 0 #000;
  background: rgb(242, 188, 0);
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all .15s ease;
}

.round.big {
  width: 50px;
  height: 50px;
  background: rgb(241, 90, 37);
  color: #fff;
}

.round:hover {
  background: #1ac2ff;
  color: #000;
  translate: 1.5px 1.5px;
  box-shadow: 1.5px 1.5px 0 #000;
}

.round:active {
  translate: 3px 3px;
  box-shadow: 0 0 0 #000;
}

.station {
  max-width: 100%;
  margin: 0;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 253, 208, .55);
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

/* The name is its own element on purpose: a bare text node inside a flex row is
   an anonymous item, and text-overflow cannot be applied to one. Station names
   in this directory run to whole sentences of tags, so it has to trail off. */
.station-name {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgb(242, 188, 0);
  flex: none;
}

.toggles {
  display: flex;
  gap: 8px;
}

.chip {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .5px;
  padding: 4px 10px;
  border: 2px solid #000;
  box-shadow: 2px 2px 0 #000;
  background: #FFFDD0;
  color: #000;
  cursor: pointer;
  transition: all .15s ease;
}

.chip.on {
  background: rgb(242, 188, 0);
}

.chip:disabled {
  opacity: .4;
  cursor: default;
}

.chip:not(:disabled):hover {
  background: #1ac2ff;
}

.footer {
  margin-top: auto;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.link {
  background: none;
  border: none;
  padding: 2px 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .5px;
  color: rgba(255, 253, 208, .65);
  cursor: pointer;
}

.link:hover {
  color: #FFFDD0;
}

.link.quit:hover {
  color: rgb(241, 90, 37);
}
</style>
