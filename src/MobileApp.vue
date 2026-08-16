<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, ref} from "vue";
import Cassete from "./components/Cassete.vue";
import StreamLoading from "./components/StreamLoading.vue";
import ToastMessage from "./components/ToastMessage.vue";
import FavoritesListModal from "./components/FavoritesListModal.vue";
import HelpModal from "./components/HelpModal.vue";
import StationListModal from "./components/StationListModal.vue";
import NowPlayingModal from "./components/NowPlayingModal.vue";
import ExitConfirmModal from "./components/ExitConfirmModal.vue";
import {useStream} from "./services/useStream.ts";
import {useFavorites} from "./services/useFavorites.ts";
import {announceReady, exitApp, useAndroidBack} from "./services/useAndroidShell.ts";
import {FormattedStation, Genre} from "./types";

/**
 * The phone layout.
 *
 * A separate root rather than responsive rules on `App.vue`: the desktop screen
 * is a wide backdrop with a cassette in the corner and interactions built on a
 * scroll wheel and keyboard, none of which exist here. Sharing one component
 * would have meant every desktop change risking the phone and the reverse.
 *
 * Everything below the view is shared - `useStream` picks the Kotlin player on
 * this platform, and the modals are the very same components.
 */

const {
  nowPlaying,
  lyrics,
  currentlyPlaying,
  currentGenre,
  genreLoading,
  genreEmpty,
  stationsCount,
  streamLoading,
  reconnecting,
  isPlaying,
  shuffle,
  stationListByGenre,
  ensureCurrentStations,
  getStations,
  resetAll,
  toggleStream,
  playNextStation,
  changeGenre,
  toggleShuffle,
  playPreviousStation,
  streamStation,
  unload,
  online
} = useStream(true);

const {favorites, isFavorite, toggle: toggleFavorite, remove: removeFavorite} = useFavorites();

/**
 * The deck fills the screen width, because it is how you get around the app.
 *
 * This cannot be done in CSS: `zoom` needs a plain number and `calc(100vw/300)`
 * yields a length, so such a rule is invalid and silently ignored. Nor can the
 * shell's 300x200 be assumed - it has no width of its own, and its buttons and
 * screws sit outside the shell, so the real box is larger. It gets measured
 * unzoomed instead, and capped by height so the cassette cannot grow past its
 * share of the screen and slide under the navigation bar.
 */
const MAX_DECK_SHARE = 0.44;

const deck = ref<HTMLElement | null>(null);
const deckZoom = ref(1);

const measureDeck = async () => {
  // Back to 1:1 first: a box already under zoom would measure its scaled self
  // and the ratio would drift a little further on every resize.
  deckZoom.value = 1;
  await nextTick();

  const shell = deck.value?.firstElementChild;
  if (!shell) return;

  const {width, height} = shell.getBoundingClientRect();
  if (!width || !height) return;

  deckZoom.value = Math.min(
      window.innerWidth / width,
      (window.innerHeight * MAX_DECK_SHARE) / height
  );
};

onMounted(() => {
  void measureDeck();
  window.addEventListener('resize', measureDeck);
});
onUnmounted(() => window.removeEventListener('resize', measureDeck));

const stationsLoadingError = ref(false);
onMounted(async () => {
  try {
    await getStations();
  } catch {
    stationsLoadingError.value = true;
  }
});

const status = computed(() => {
  if (!online.value) return 'Offline';
  if (reconnecting.value) return 'Reconnecting...';
  if (streamLoading.value) return 'Connecting...';
  return isPlaying.value ? 'On air' : 'Paused';
});

const toastMessage = ref('');
const toastTitle = ref('');
const closeToast = () => {
  toastMessage.value = '';
  toastTitle.value = '';
};

const saveCurrent = () => {
  const station = currentlyPlaying.value;
  const result = toggleFavorite(station);
  if (!result || !station) return;
  toastTitle.value = result === 'added' ? 'Saved' : 'Removed';
  toastMessage.value = `${station.name} ${result === 'added' ? 'added to' : 'removed from'} favourites`;
};

const favoritesModal = ref(false);
const stationListModal = ref(false);
const nowPlayingModal = ref(false);
const helpModal = ref(false);

const exitConfirm = ref(false);

/**
 * Back: close what is open, then warn, then ask. The dialog registers in the
 * same dismiss stack, so a further press retracts the question.
 */
useAndroidBack(
    () => {
      toastTitle.value = 'Leaving?';
      toastMessage.value = 'Press back again to close minke fm';
    },
    () => (exitConfirm.value = true)
);

/**
 * Tells the shell the layout exists, which both dismisses the splash and makes
 * it re-send the window insets - those applied before the page loaded were
 * evaluated into nothing.
 */
onMounted(announceReady);

/** Playing a favourite switches genre without pulling its stations. */
const openStationList = () => {
  void ensureCurrentStations();
  stationListModal.value = true;
};

const playStation = (station: FormattedStation) => {
  favoritesModal.value = false;
  stationListModal.value = false;
  streamStation(station);
};

const dropFavorite = (station: FormattedStation) => {
  removeFavorite(station);
  toastTitle.value = 'Removed';
  toastMessage.value = `${station.name} removed from favourites`;
};

/**
 * Closing means closing. The playback service is a foreground service and
 * outlives the activity by design - that is what keeps the radio going when the
 * app is backgrounded - so an explicit exit has to tear it down, or the station
 * plays on with no UI left to reach it.
 */
const confirmExit = () => {
  unload();
  exitApp();
};

const setGenre = (genre: Genre) => void changeGenre(genre);
const reset = () => void resetAll();
</script>

<template>
  <div class="screen">
    <!-- The display: everything about what is playing, framed like a panel on
         a stereo rather than floating on the background. -->
    <div class="display">
      <div class="info">
      <p class="on-air">{{ status }}</p>

      <div
          class="sleeve"
          :class="{ empty: !nowPlaying?.artwork }"
          @click="nowPlayingModal = true"
      >
        <img v-if="nowPlaying?.artwork" :src="nowPlaying.artwork" alt=""/>
        <span v-else>&#9834;</span>
      </div>

      <StreamLoading v-if="streamLoading" class="spinner"/>

      <template v-else-if="currentlyPlaying">
        <p class="station" :title="currentlyPlaying.name">
          <!-- Its own element: a bare text node in a flex row is an anonymous
               item, which cannot take text-overflow and centres to show the
               middle of a long name instead of the start. -->
          <span class="station-name">{{ currentlyPlaying.name }}</span>
          <button class="star" :class="{ on: isFavorite(currentlyPlaying) }" @click="saveCurrent">
            {{ isFavorite(currentlyPlaying) ? '★' : '☆' }}
          </button>
        </p>

        <p v-if="nowPlaying" class="track" @click="nowPlayingModal = true">
          {{ nowPlaying.artist }} &mdash; {{ nowPlaying.song }}
        </p>
        <p v-if="nowPlaying?.album" class="album">{{ nowPlaying.album }}</p>
        <p v-else-if="!nowPlaying" class="album">
          {{ currentlyPlaying.country || currentGenre }}
        </p>
      </template>

      <p v-if="genreLoading" class="album">Loading {{ currentGenre }}...</p>
      <p v-if="genreEmpty" class="warn">Nothing playable under &ldquo;{{ currentGenre }}&rdquo;</p>
      <p v-if="stationsLoadingError" class="warn">Could not load stations</p>
      </div>
    </div>

    <!-- The deck sits at the bottom, where a thumb reaches. -->
    <div class="deck" ref="deck" :style="{ '--deck-zoom': deckZoom }">
      <Cassete
          :current-genre="currentGenre"
          :station-count="stationsCount"
          :shuffle="shuffle"
          :is-playing="isPlaying"
          @toggle-player="toggleStream"
          @play-next="playNextStation"
          @play-previous="playPreviousStation"
          @toggle-shuffle="toggleShuffle"
          @set-genre="setGenre"
          @toggle-favorites-modal="favoritesModal = true"
          @open-station-list-modal="openStationList"
          @open-help-modal="helpModal = true"
          @reset-all="reset"
      />
    </div>

    <ToastMessage @close-toast="closeToast" :toast-message="toastMessage" :toast-title="toastTitle"/>
    <FavoritesListModal v-if="favoritesModal" :favorite-stations="favorites"
                        @set-station="playStation" @remove-station="dropFavorite"
                        @close-modal="favoritesModal = false"/>
    <StationListModal v-if="stationListModal" :stations="stationListByGenre" :loading="genreLoading"
                      @set-station="playStation" @close-modal="stationListModal = false"/>
    <NowPlayingModal v-if="nowPlayingModal" :now-playing="nowPlaying" :lyrics="lyrics"
                     @close-modal="nowPlayingModal = false"/>
    <HelpModal v-if="helpModal" @close-modal="helpModal = false"/>
    <ExitConfirmModal v-if="exitConfirm" @close-modal="exitConfirm = false" @confirm="confirmExit"/>
  </div>
</template>

<style scoped>
.screen {
  min-height: 100vh;
  /* No horizontal padding: the deck runs edge to edge, and the display adds its
     own. Kept in sync with the system bars in phase 3. */
  /* Pushed in by MainActivity from WindowInsetsCompat. The fallbacks only
     apply for the instant before the first inset arrives - CSS
     env(safe-area-inset-*) is not usable here, it reports the display cutout
     rather than the status bar height. */
  padding: var(--safe-top, 24px) var(--safe-right, 0px) var(--safe-bottom, 24px) var(--safe-left, 0px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  font-family: Montserrat, sans-serif;
  color: #FFFDD0;
  overflow: hidden;
}

/* The background is never animated - it is the same colour as the splash, so
   fading it would have opened a hole onto the bare window, which is the flash
   this is meant to avoid. Only the contents rise into place, under the splash
   as it dissolves. */
.display,
.deck {
  animation: surface 380ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.deck {
  animation-delay: 60ms;
}

@keyframes surface {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* A lit panel, with the same faint scanline the lyrics window uses, so the top
   half reads as part of the machine instead of empty background. */
.display {
  position: relative;
  flex: 1;
  min-height: 0;
  margin: 0 12px 12px;
  padding: 16px;
  box-sizing: border-box;
  background: #252525;
  border: 3px solid #000;
  box-shadow: 6px 6px 0 #000;
  overflow: hidden;
  display: flex;
}

.display::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.03) 0 1px,
      transparent 1px 3px
  );
}

.info {
  /* `margin: auto` rather than the parent's justify-content: the panel is the
     flexible row, and centring it any other way left this block pinned to the
     top with all the slack below it. */
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  /* Everything here is one line or a fixed square, so nothing should ever need
     to overflow - but clipping beats overlapping if a name gets absurd. */
  overflow: hidden;
  width: 100%;
}

/* The app pulls in daisyUI, whose own `.status` is an 8x8 dot and whose
   `.loading` is a square spinner - both silently claimed these elements until
   they were renamed. Generic class names are not safe here; `.card` is taken
   too. flex:none keeps the rows from being squeezed by the column flex. */
.on-air,
.station,
.track,
.album,
.warn {
  flex: none;
  width: 100%;
}

.on-air {
  margin: 0;
  white-space: nowrap;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(255, 253, 208, 0.5);
}

.sleeve {
  /* Bounded by height as well as width: with only the width limit the artwork
     grew past the space above the deck and the text under it collapsed to
     nothing and overlapped. */
  width: min(58vw, 240px, 30vh);
  aspect-ratio: 1;
  flex: none;
  border: 3px solid #000;
  box-shadow: 7px 7px 0 #000;
  background: #171717;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
}

.sleeve img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sleeve.empty {
  color: rgb(242, 188, 0);
  font-size: 72px;
}

/* Station names in this directory run to whole sentences of tags. */
.station {
  margin: 4px 0 0;
  max-width: 100%;
  font-size: 15px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
}

.station-name,
.track,
.album {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  min-width: 0;
}

.star {
  flex: none;
  background: none;
  border: none;
  padding: 0;
  font-size: 20px;
  line-height: 1;
  color: rgba(255, 253, 208, 0.45);
  cursor: pointer;
}

.star.on {
  color: rgb(242, 188, 0);
}

.track {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: rgb(241, 90, 37);
  cursor: pointer;
}

.album {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 253, 208, 0.55);
}

.warn {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: rgb(241, 90, 37);
}

.spinner {
  flex: none;
  transform: scale(0.85);
}

/* The deck hugs the cassette rather than reserving a fixed 40% band: the
   cassette is 300x200 and grows until it hits the screen *width*, landing near
   30% of the height on a phone. Reserving 40% only left dead space above it.
   `zoom` rather than `transform: scale` because zoom resizes the layout box -
   with a transform the box stayed 200px tall and the scaled-up shell spilled
   off the bottom of the screen. */
/* Full width, deliberately: the deck is the main way around the app, so it gets
   the whole bottom of the screen rather than sitting as a small card. The shell
   is 300px wide, so the zoom is whatever fills the viewport. */
.deck {
  flex: none;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
}

.deck :deep(.main) {
  zoom: var(--deck-zoom, 1);
}
</style>

<style>
/*
 * Deliberately unscoped: it has to reach the modal components, which are shared
 * with the desktop and style their own backdrops. Safe because this root is
 * only ever mounted on Android, and `--keyboard` is only ever set there.
 *
 * Without it the search fields in the station and genre pickers sit behind the
 * keyboard - you type and cannot see what you typed.
 */
.modal-backdrop {
  box-sizing: border-box;
  padding-bottom: var(--keyboard, 0px);
  transition: padding-bottom 160ms ease-out;
}
</style>
