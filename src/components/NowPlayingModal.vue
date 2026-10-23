<script setup lang="ts">
import {ref} from "vue";
import {useEscapeToClose} from "../services/useEscapeToClose.ts";
import {Lyrics, NowPlaying} from "../services/useNowPlaying.ts";
import {useRememberedScroll} from "../services/useRememberedScroll.ts";
import {HeardTrack, useTrackHistory} from "../services/useTrackHistory.ts";

interface Props {
  nowPlaying: NowPlaying | null;
  lyrics: Lyrics | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{ closeModal: [] }>();

// Keyed by track: reopening the same song returns to where you were reading,
// a different song starts at the top.
const {container} = useRememberedScroll(
    () => `lyrics:${props.nowPlaying?.artist ?? ''}|${props.nowPlaying?.song ?? ''}`
);

const closeModal = () => emit('closeModal');

useEscapeToClose(closeModal);

/**
 * The history lives behind a tab here rather than a button of its own: the
 * deck has no room to spare, and "what was that song" is a question asked
 * right after looking at what is playing now.
 */
const tab = ref<'now' | 'history'>('now');
const {history, clear} = useTrackHistory();

/** Today shows just the time; anything older gets its date too. */
const heardWhen = (at: number) => {
  const date = new Date(at);
  const time = date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${date.toLocaleDateString([], {day: 'numeric', month: 'short'})} ${time}`;
};

/**
 * The Clipboard API, with the old textarea trick behind it: the Android
 * webview can refuse the API even in a secure context.
 */
const writeClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // Falls through to the fallback.
  }
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  document.execCommand('copy');
  field.remove();
};

/** Which row just got copied, so it can say so for a moment. */
const copied = ref<number | null>(null);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

const copyTrack = async (track: HeardTrack) => {
  await writeClipboard(`${track.artist} - ${track.song}`);
  copied.value = track.heardAt;
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => (copied.value = null), 1500);
};

/** Two taps, since there is no getting it back. */
const confirmingClear = ref(false);
const clearHistory = () => {
  if (!confirmingClear.value) {
    confirmingClear.value = true;
    return;
  }
  clear();
  confirmingClear.value = false;
};
</script>

<template>
  <div class="modal-backdrop" @click="closeModal">
    <div class="card" @click.stop>
      <div class="head flex justify-between items-center">
        <div class="tabs-row flex gap-4">
          <button class="tab-button" :class="{ active: tab === 'now' }" @click="tab = 'now'">
            Now playing
          </button>
          <button class="tab-button" :class="{ active: tab === 'history' }" @click="tab = 'history'">
            History<template v-if="history.length"> ({{ history.length }})</template>
          </button>
        </div>
        <button @click="closeModal" class="btn btn-ghost btn-error btn-xs">X</button>
      </div>

      <template v-if="tab === 'now'">
      <!-- Track panel. Every field is optional and simply absent when unknown. -->
      <div class="track-panel flex gap-4 items-center">
        <div class="sleeve" :class="{ 'sleeve-empty': !nowPlaying?.artwork }">
          <img v-if="nowPlaying?.artwork" :src="nowPlaying.artwork" alt=""/>
          <span v-else>&#9834;</span>
        </div>

        <div class="flex flex-col gap-1 min-w-0">
          <template v-if="nowPlaying">
            <span class="song">{{ nowPlaying.song }}</span>
            <span class="artist">{{ nowPlaying.artist }}</span>
            <span v-if="nowPlaying.album" class="album">
              {{ nowPlaying.album }}<template v-if="nowPlaying.year"> &middot; {{ nowPlaying.year }}</template>
            </span>
          </template>
          <span v-else class="artist">This station isn't announcing tracks</span>
        </div>
      </div>

      <div class="lyrics-window">
        <div v-if="lyrics" class="lyrics-scroll" ref="container">
          <p v-for="(line, index) in lyrics.lines" :key="index" class="lyric-line">
            {{ line || '&nbsp;' }}
          </p>
        </div>

        <div v-else class="empty-note">
          <p v-if="nowPlaying">No lyrics found for this track</p>
          <p v-else>Waiting for the station to announce a track</p>
        </div>
      </div>
      </template>

      <!-- Same dark display as the lyrics, so switching tabs swaps the
           contents rather than the whole look. -->
      <template v-else>
        <div class="history-bar flex justify-between items-center">
          <span>Tap a song to copy it</span>
          <button v-if="history.length" class="clear-button" @click="clearHistory"
                  @blur="confirmingClear = false">
            {{ confirmingClear ? 'Sure? Tap again' : 'Clear' }}
          </button>
        </div>
        <div class="lyrics-window history-window">
          <div v-if="history.length" class="lyrics-scroll history-scroll">
            <button
                v-for="track in history"
                :key="track.heardAt"
                class="heard flex gap-3 items-center"
                @click="copyTrack(track)"
            >
              <span class="thumb" :class="{ 'thumb-empty': !track.artwork }">
                <img v-if="track.artwork" :src="track.artwork" alt=""/>
                <template v-else>&#9834;</template>
              </span>
              <span class="flex flex-col min-w-0 flex-1">
                <span class="heard-song">{{ track.song }}</span>
                <span class="heard-artist">{{ track.artist }}</span>
                <span v-if="track.album" class="heard-meta">
                  {{ track.album }}<template v-if="track.year"> &middot; {{ track.year }}</template>
                </span>
                <!-- Under the song rather than beside it: on a phone a station
                     name in its own column left the titles a few letters wide. -->
                <span class="heard-station">on {{ track.station }}</span>
              </span>
              <span class="heard-when flex-none self-start">
                {{ copied === track.heardAt ? 'Copied!' : heardWhen(track.heardAt) }}
              </span>
            </button>
          </div>
          <div v-else class="empty-note">
            <p>Songs the stations announce will show up here</p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.card {
  font-family: Montserrat, sans-serif;
  width: min(540px, 92vw);
  translate: -6px -6px;
  background: rgb(242, 188, 0);
  border: 3px solid #000000;
  box-shadow: 12px 12px 0 #000000;
  overflow: hidden;
  transition: all 0.3s ease;
  padding: 20px;
}

.head {
  font-family: Montserrat, sans-serif;
  font-size: 14px;
  font-weight: 900;
  width: 100%;
  height: 32px;
  background: #ffffff;
  padding: 5px 12px;
  color: #000000;
  border-bottom: 3px solid #000000;
}

/* The cassette's own cream label, so the panel reads as part of the deck. */
.track-panel {
  background: #FFFDD0;
  border: 3px solid #000;
  border-top: none;
  padding: 14px;
}

.sleeve {
  width: 84px;
  height: 84px;
  flex: none;
  border: 3px solid #000;
  box-shadow: 4px 4px 0 #000;
  background: #252525;
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

.sleeve-empty {
  color: rgb(242, 188, 0);
  font-size: 34px;
}

.song {
  font-weight: 900;
  font-size: 17px;
  color: #000;
  overflow-wrap: anywhere;
}

.artist {
  font-weight: 700;
  font-size: 13px;
  color: rgb(241, 90, 37);
  overflow-wrap: anywhere;
}

.album {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  overflow-wrap: anywhere;
}

/* Dark window with a faint scanline, like a lit display on a stereo. */
.lyrics-window {
  position: relative;
  height: 280px;
  margin-top: 12px;
  background: #171717;
  border: 3px solid #000;
  box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.9);
  overflow: hidden;
}

.lyrics-window::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.04) 0 1px,
      transparent 1px 3px
  );
}

.lyrics-scroll {
  height: 100%;
  overflow-y: auto;
  padding: 18px;
  /* Keeps a wheel that reaches the end of the list from scrolling the page. */
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.lyrics-scroll::-webkit-scrollbar {
  display: none;
}

.lyric-line {
  font-family: 'Indie Flower', cursive;
  font-size: 19px;
  line-height: 1.6;
  text-align: center;
  color: rgba(255, 253, 208, 0.82);
}

.empty-note {
  font-family: Montserrat, sans-serif;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  color: rgba(255, 253, 208, 0.45);
  letter-spacing: 0.5px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
}

.card:hover {
  translate: -6px;
}

.tab-button {
  font-weight: 900;
  color: rgba(0, 0, 0, 0.35);
  cursor: pointer;
}

.tab-button.active {
  color: #000;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.history-bar {
  background: #FFFDD0;
  border: 3px solid #000;
  border-top: none;
  padding: 8px 14px;
  font-size: 11px;
  font-weight: 700;
  color: #444;
}

.clear-button {
  padding: 2px 10px;
  border: 2px solid #000;
  box-shadow: 2px 2px 0 #000;
  background: rgb(241, 90, 37);
  color: white;
  font-weight: 800;
  cursor: pointer;
}

/* Taller than the lyrics by what the track panel takes, less the bar above
   it, so the card keeps its size when switching tabs. */
.history-window {
  height: 362px;
}

.history-scroll {
  padding: 8px;
}

.heard {
  width: 100%;
  padding: 8px;
  text-align: left;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 253, 208, 0.08);
}

.heard:hover {
  background: rgba(255, 253, 208, 0.06);
}

.thumb {
  width: 40px;
  height: 40px;
  flex: none;
  border: 2px solid #000;
  background: #252525;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-empty {
  color: rgb(242, 188, 0);
  font-size: 18px;
}

.heard-song,
.heard-artist,
.heard-meta,
.heard-station {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.heard-song {
  font-size: 13px;
  font-weight: 800;
  color: #FFFDD0;
}

.heard-artist {
  font-size: 12px;
  font-weight: 700;
  color: rgb(241, 90, 37);
}

.heard-meta {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 253, 208, 0.45);
}

.heard-when {
  font-size: 11px;
  font-weight: 800;
  color: #67e8f9;
}

.heard-station {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 253, 208, 0.45);
}
</style>
