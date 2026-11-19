<script setup lang="ts">
/**
 * The phone's "?": what the app can do, on one screen. The desktop keeps its list of
 * keyboard shortcuts (HelpModal.vue), which mean nothing on a phone.
 *
 * Written for every skin at once: the things that sit in the same place on every
 * skin (the star, the moon, the half circle) are named by their symbol; the deck's
 * buttons, which each skin draws its own way, by what they do.
 */
import {useEscapeToClose} from "../services/useEscapeToClose.ts";

const emit = defineEmits<{ closeModal: [] }>();
const closeModal = () => emit('closeModal');
useEscapeToClose(closeModal);

const topics: [string, string][] = [
  ['Play', 'Pick a genre or a country and press play. Previous and next step through its stations, and shuffle jumps around them.'],
  ['Genres', 'Tap the genre on the deck to change it: 172 of them, or type any other.'],
  ['Countries', 'In the same picker, under Countries: nearly 200. Spin the globe picks one for you.'],
  ['Find a station', 'The deck’s list button shows every station in the genre, with a search by name.'],
  ['The song', 'When a station says what it’s playing, you see the artist and title. Tap them for the lyrics and a list of songs you’ve heard.'],
  ['Favourites', 'Tap ☆ next to the station’s name to keep it. The deck’s favourites button lists them.'],
  ['Sleep timer', 'Tap ☾ in the top right: 15, 30, 60 or 90 minutes, then off. The last 30 seconds fade out, and a touch during the fade keeps the radio on.'],
  ['Skins', 'Tap ◐ in the top left to change the deck. The whole app changes with it.'],
  ['Screen off', 'The radio keeps playing locked or in the background. Pause or change stations from the lock screen or your headphones.'],
  ['Dead stations', 'If a station stops answering, the next one starts by itself.'],
  ['Start over', 'The deck’s reset button fetches the stations again. Your favourites stay.'],
];
</script>

<template>
  <div class="modal-backdrop" @click="closeModal">
    <div class="card guide-card" @click.stop>
      <div class="head flex justify-between items-center">
        <span>How MinkeFM works</span>
        <button @click="closeModal" class="btn btn-ghost btn-error btn-xs">X</button>
      </div>
      <dl class="guide">
        <div v-for="[term, text] in topics" :key="term" class="guide-row">
          <dt>{{ term }}</dt>
          <dd>{{ text }}</dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--m-backdrop, rgba(0, 0, 0, 0.3));
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.card {
  display: flex;
  flex-direction: column;
  font-family: var(--m-font, Montserrat, sans-serif);
  width: min(440px, 92vw);
  max-height: calc(100% - 48px);
  translate: -6px -6px;
  background: var(--m-card, rgb(242, 188, 0));
  color: var(--m-ink, #000);
  border: var(--m-bw, 3px) solid var(--m-line, #000);
  box-shadow: var(--m-shadow-lg, 12px 12px 0 #000);
  border-radius: var(--m-radius, 0);
  padding: 20px;
}

.head {
  flex: none;
  font-size: 14px;
  font-weight: 900;
  width: 100%;
  height: 32px;
  background: var(--m-head, #ffffff);
  padding: 5px 12px;
  color: var(--m-head-fg, #000000);
  border-bottom: var(--m-bw, 3px) solid var(--m-line, #000);
}

.guide {
  margin: 0;
  padding: 4px 4px 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.guide-row {
  padding: 10px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--m-line, #000) 25%, transparent);
}

.guide-row:last-child {
  border-bottom: none;
}

.guide-row dt {
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.guide-row dd {
  margin: 3px 0 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

button {
  -webkit-user-select: none;
  user-select: none;
}
</style>
