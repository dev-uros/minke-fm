<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, Ref, ref, watch} from "vue";
import Clock from "./components/Clock.vue";
import Cassete from "./components/Cassete.vue";
import StreamLoading from "./components/StreamLoading.vue";
import SaveStation from "./components/SaveStation.vue";
import {useStream} from "./services/useStream.ts";
import {FormattedStation, Genre} from "./types";
import {useBackgroundVideo} from "./services/useBackgroundVideo.ts";
import ToastMessage from "./components/ToastMessage.vue";
import FavoritesListModal from "./components/FavoritesListModal.vue";
import HelpModal from "./components/HelpModal.vue";
import StationListModal from "./components/StationListModal.vue";
import NowPlayingModal from "./components/NowPlayingModal.vue";
import {useTray} from "./services/useTray.ts";

const {
  nowPlaying,
  lyrics,
  currentlyPlaying,
  currentGenre,
  genreLoading,
  genreEmpty,
  streamVolume,
  stationsCount,
  streamLoading,
  reconnecting,
  isPlaying,
  needsGesture,
  reconnectAttempt,
  shuffle,
  stationListByGenre,
  getStations,
  resetAll,
  toggleStream,
  unload,
  playNextStation,
  changeGenre,
  toggleShuffle,
  playPreviousStation,
  streamStation,
  online
} = useStream();


// The player reconnects itself, so the only thing left to recover here is the
// station list when the very first load happened with no internet.
watch(online, (value) => {
  if (value && stationsCount.value === 0) {
    void reloadStations();
  }
})

const internetStatus = computed(() => {
  if (!online.value) return 'Offline - waiting for connection';
  if (needsGesture.value) return 'Press play to start';
  if (reconnecting.value) return `Reconnecting... (${reconnectAttempt.value})`;
  if (streamLoading.value) return 'Connecting...';
  return isPlaying.value ? 'Online' : 'Paused';
})


const togglePlayer = () => {
  toggleStream();
}

const video = ref<HTMLVideoElement>();
const {source: backgroundVideo, fetched: backgroundFetched, setGenre: setBackgroundFor} =
    useBackgroundVideo();

// The <source> child only takes effect after load(), and load() must wait for
// Vue to have written the new src into the DOM.
watch(backgroundVideo, () => {
  nextTick(() => {
    if (!video.value) return;
    video.value.load();
    // load() aborts any in-flight play(), which rejects the previous promise.
    video.value.play().catch(() => undefined);
  });
});

const setGenre = (genre: Genre) => {
  void changeGenre(genre);
  void setBackgroundFor(genre);
}

const changeVideo = () => void setBackgroundFor(currentGenre.value);

const onKeyDown = (event: KeyboardEvent) => {
  if (stationListModal.value) return;
  // The now-playing modal handles its own keys.
  if (nowPlayingModal.value) return;

  if (event.code === 'KeyL') {
    nowPlayingModal.value = true;
    return
  }

  if (event.code === "Space") {
    event.preventDefault();
    togglePlayer();
    return
  }

  if (event.code === 'KeyG') {
    changeVideo();
    return;
  }
  if (event.code === 'KeyH') {
    if (!streamLoading.value) {
      playPreviousStation();
    }
  }
  if (event.code === 'KeyJ') {
    if (!streamLoading.value) {
      playNextStation();
    }
  }
  if (event.code === 'KeyK') {
    if (!streamLoading.value) {
      toggleShuffle()
    }
  }
}
const onWheel = (event: WheelEvent) => {
  // An open modal owns its own scrolling, so the volume wheel must not steal it.
  // Checked against the DOM rather than a list of flags, so a modal added later
  // is covered without anyone having to remember this.
  if (event.target instanceof Element && event.target.closest('.modal-backdrop')) return;

  if (event.deltaY < 0) {
    streamVolume.value = Math.min(1, streamVolume.value + 0.1);
  } else if (event.deltaY > 0) {
    streamVolume.value = Math.max(0, streamVolume.value - 0.1);
  }
};
onUnmounted(() => {
  unload();
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("wheel", onWheel);

});
const stationsLoadingError = ref(false);
onMounted(async () => {

  const localStorageFavorites = localStorage.getItem('favorites');
  if (localStorageFavorites) {
    favorites.value = JSON.parse(localStorageFavorites);
  }
  try {
    await getStations();

  } catch (error) {
    stationsLoadingError.value = true;
  }
  // Fetch a backdrop for whatever genre we started on.
  void setBackgroundFor(currentGenre.value);

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("wheel", onWheel);
})

const favorites: Ref<FormattedStation[]> = ref([]);
const toastMessage = ref('');
const toastTitle = ref('');
const closeToast = () => {
  toastMessage.value = '';
  toastTitle.value = '';
}
const setFavorite = () => {
  if (currentlyPlaying.value) {
    const favoriteExistsIndex = favorites.value.findIndex(fav => fav.id === currentlyPlaying.value!.id)
    if (favoriteExistsIndex === -1) {
      favorites.value.unshift(currentlyPlaying.value);
      toastMessage.value = `${currentlyPlaying.value.name} added to favorites!`
      toastTitle.value = 'New favorite station!'
      localStorage.setItem('favorites', JSON.stringify(favorites.value));
    } else {
      favorites.value.splice(favoriteExistsIndex, 1);
      toastMessage.value = `${currentlyPlaying.value.name} removed from favorites!`
      toastTitle.value = 'Station removed from favorites!'
      localStorage.setItem('favorites', JSON.stringify(favorites.value));
    }

  }
}

const favoritesModalShown = ref(false);

// Shared by the favourites list and the station search, so both close - picking
// a station is the end of what either modal is for.
const playStation = (station: FormattedStation) => {
  favoritesModalShown.value = false;
  stationListModal.value = false;
  streamStation(station);
}

const removeStationFromFavorites = (station: FormattedStation) => {
  favoritesModalShown.value = false;
  const favoriteExistsIndex = favorites.value.findIndex(fav => fav.id === station.id)
  favorites.value.splice(favoriteExistsIndex, 1);
  toastMessage.value = `${station.name} removed from favorites!`
  toastTitle.value = 'Station removed from favorites!'
  localStorage.setItem('favorites', JSON.stringify(favorites.value));
}

const reloadStations = async () => {
  stationsLoadingError.value = false;
  try {
    await getStations();

  } catch (error) {
    stationsLoadingError.value = true;
  }
}

/** The cassette's rewind button: everything back to a fresh start. */
const resetEverything = async () => {
  stationsLoadingError.value = false;
  try {
    await resetAll();
  } catch (error) {
    stationsLoadingError.value = true;
  }
  void setBackgroundFor(currentGenre.value);
}

const helpModal = ref(false)
const openHelpModal = () => {
  helpModal.value = true
}

const closeHelpModal = () => {
  helpModal.value = false
}


const stationListModal = ref(false)
const openStationListModal = () => {
  stationListModal.value = true
}

const nowPlayingModal = ref(false)

const currentIsFavourite = computed(() =>
    !!currentlyPlaying.value && favorites.value.some(fav => fav.id === currentlyPlaying.value!.id)
);

// One source of truth: the menu bar reads this, and its controls call the same
// functions the cassette buttons do.
useTray(
    () => ({
      station: currentlyPlaying.value?.name ?? null,
      track: nowPlaying.value ? `${nowPlaying.value.artist} \u2014 ${nowPlaying.value.song}` : null,
      artist: nowPlaying.value?.artist ?? null,
      song: nowPlaying.value?.song ?? null,
      artwork: nowPlaying.value?.artwork ?? null,
      genre: currentGenre.value,
      // Not isPlaying: while connecting or reconnecting the player is already
      // trying to play, so the menu must offer "Pause". Labelling that "Play"
      // would hand the user a button that does the opposite of what it says.
      playing: isPlaying.value || streamLoading.value || reconnecting.value,
      shuffle: shuffle.value,
      favourite: currentIsFavourite.value
    }),
    {
      playPause: togglePlayer,
      next: playNextStation,
      previous: playPreviousStation,
      toggleShuffle,
      toggleFavourite: setFavorite
    }
);

</script>

<template>
  <div class="flex flex-col min-h-screen">
    <video
        ref="video"
        autoplay
        muted
        loop
        playsinline
        class="fixed top-0 left-0 w-full h-full object-cover -z-10"
    >
      <source :src="backgroundVideo" type="video/mp4"/>
      Your browser does not support the video tag.
    </video>
    <div class="flex justify-between p-5 font-press-start">
      <div class="flex flex-col gap-5">
        <!-- Station, origin and track share one guard so they appear together.
             The proxy reads the track title from the stream several seconds
             before that audio is audible, so an ungated track line would sit
             above the "Loading..." spinner announcing a song nobody can hear. -->
        <div v-if="!streamLoading && currentlyPlaying" class="flex flex-col gap-5">
          <!-- min-w-0 lets the name truncate; without it a long station name
               grows the row and pushes the save icon off the edge. -->
          <h1 class="flex items-center gap-3 max-w-[60vw]">
            <span class="truncate min-w-0" :title="currentlyPlaying.name">
              Current station: {{ currentlyPlaying.name }}
            </span>
            <span class="shrink-0 flex"><SaveStation @click="setFavorite"/></span>
          </h1>
          <h2 class="truncate max-w-[60vw]">
            Coming to you from: {{ currentlyPlaying.country }}{{ currentlyPlaying.state ? ', ' + currentlyPlaying.state : '' }}
          </h2>
          <!-- Only shown when the title was confirmed to be a track, never a
               station ident. The album line needs a verified store match. -->
          <div
              v-if="nowPlaying"
              class="flex items-center gap-3 cursor-pointer"
              title="Open now playing (L)"
              @click="nowPlayingModal = true"
          >
            <img
                v-if="nowPlaying.artwork"
                :src="nowPlaying.artwork"
                alt=""
                class="w-14 h-14 border-2 border-black shadow-[3px_3px_0_#000]"
            />
            <div class="flex flex-col gap-1">
              <h2 class="text-cyan-300">
                &#9834; {{ nowPlaying.artist }} &mdash; {{ nowPlaying.song }}
              </h2>
              <h3 v-if="nowPlaying.album" class="text-xs opacity-70">
                {{ nowPlaying.album }}<span v-if="nowPlaying.year"> ({{ nowPlaying.year }})</span>
              </h3>
            </div>
          </div>
        </div>
        <h2 v-if="reconnecting" class="text-yellow-300">
          Signal lost - reconnecting (attempt {{ reconnectAttempt }})...
        </h2>
        <h2 v-if="genreEmpty" class="text-red-400">
          Nothing playable under &ldquo;{{ currentGenre }}&rdquo; &mdash; try another genre.
        </h2>
        <h2 v-if="genreLoading" class="text-yellow-300">
          Loading {{ currentGenre }} stations...
        </h2>
        <h2 v-if="stationsLoadingError" class="text-red-400">
          Could not load the station list. Check your connection and hit reload.
        </h2>

        <StreamLoading v-if="streamLoading"/>
      </div>
      <div>
        <Clock/>
      </div>
    </div>

    <div class="flex flex-col gap-2 fixed bottom-0 left-0 m-4">
      <h1>{{ internetStatus }}</h1>
      <!-- Pexels' API terms ask for a visible credit while showing their video. -->
      <a v-if="backgroundFetched" href="https://www.pexels.com" target="_blank"
         class="text-[10px] opacity-60 hover:opacity-100">Backgrounds by Pexels</a>
      <Cassete
          @open-help-modal="openHelpModal"
          @open-station-list-modal="openStationListModal"
          @reset-all="resetEverything"
          @toggle-favorites-modal="favoritesModalShown = true" @play-next="playNextStation"
          @play-previous="playPreviousStation" @toggle-shuffle="toggleShuffle" @set-genre="setGenre"
          :shuffle="shuffle" :station-count="stationsCount" :current-genre="currentGenre"
          :is-playing="isPlaying" @toggle-player="togglePlayer"/>
    </div>
    <div class="flex flex-col gap-5 fixed bottom-0 right-0 m-4 items-center">
      <div :class="streamVolume < 1 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="streamVolume < 0.9 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="streamVolume < 0.8 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="streamVolume < 0.7 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="streamVolume < 0.6 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="streamVolume < 0.5 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="streamVolume < 0.4 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="streamVolume < 0.3 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="streamVolume < 0.2 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
      <div :class="streamVolume < 0.1 ? 'w-12 h-12 rounded-full bg-gray-100' : 'w-32 h-12 bg-gray-100'"></div>
    </div>
    <ToastMessage @close-toast="closeToast" :toast-message="toastMessage" :toast-title="toastTitle"/>
    <FavoritesListModal @remove-station="removeStationFromFavorites" @set-station="playStation"
                        @close-modal="favoritesModalShown = false" v-if="favoritesModalShown"
                        :favorite-stations="favorites"/>
    <HelpModal v-if="helpModal" @close-modal="closeHelpModal"/>
    <StationListModal :stations="stationListByGenre" @set-station="playStation"
                      @close-modal="stationListModal = false" v-if="stationListModal"/>
    <NowPlayingModal v-if="nowPlayingModal" :now-playing="nowPlaying" :lyrics="lyrics"
                     @close-modal="nowPlayingModal = false"/>

  </div>

</template>
