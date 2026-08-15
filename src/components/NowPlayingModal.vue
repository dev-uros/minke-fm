<script setup lang="ts">
import {useEscapeToClose} from "../services/useEscapeToClose.ts";
import {Lyrics, NowPlaying} from "../services/useNowPlaying.ts";
import {useRememberedScroll} from "../services/useRememberedScroll.ts";

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
</script>

<template>
  <div class="modal-backdrop" @click="closeModal">
    <div class="card" @click.stop>
      <div class="head flex justify-between items-center">
        <span>Now playing</span>
        <button @click="closeModal" class="btn btn-ghost btn-error btn-xs">X</button>
      </div>

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
  width: 540px;
  max-width: 92vw;
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
</style>
