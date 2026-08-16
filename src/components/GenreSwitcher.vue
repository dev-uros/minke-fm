<script setup lang="ts">
import {computed, onMounted, ref} from "vue";
import {Genre, GenreOption} from "../types";
import {normalizeGenreInput, useGenres} from "../services/useGenres.ts";
import {useRememberedScroll} from "../services/useRememberedScroll.ts";
import {useEscapeToClose} from "../services/useEscapeToClose.ts";

interface Props {
  current: Genre;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  closeModal: [],
  setGenre: [genre: Genre]
}>();

const closeModal = () => emit('closeModal');

useEscapeToClose(closeModal);
const setGenre = (genre: Genre) => emit('setGenre', genre);

const {genres, loadCounts} = useGenres();
const {container, restore} = useRememberedScroll(() => 'genres');

onMounted(async () => {
  await loadCounts();
  // Counts re-sort the list, which moves everything under the restored offset,
  // so the position has to be put back once the final order is in.
  restore();
});

const search = ref('');

const matches = computed(() => {
  const query = normalizeGenreInput(search.value);
  if (!query) return genres.value;
  return genres.value.filter(option =>
      option.name.includes(query) || option.label.toLowerCase().includes(query)
  );
});

/**
 * Any radio-browser tag is playable, so a search with no catalogue match is
 * offered as-is rather than rejected. The catalogue is a starting point, not a
 * whitelist.
 */
const custom = computed<Genre | null>(() => {
  const query = normalizeGenreInput(search.value);
  if (!query) return null;
  if (matches.value.some(option => option.name === query)) return null;
  return query;
});

const grouped = computed(() => {
  const families = new Map<string, GenreOption[]>();
  for (const option of matches.value) {
    const bucket = families.get(option.family);
    if (bucket) bucket.push(option);
    else families.set(option.family, [option]);
  }
  return [...families.entries()];
});
</script>

<template>
  <div class="modal-backdrop" @click="closeModal">
    <div class="card" @click.stop>
      <div class="head flex justify-between items-center">
        <span>Switch genre</span>
        <button @click="closeModal" class="btn btn-ghost btn-error btn-xs">X</button>
      </div>

      <div class="search-head">
        <input
            v-model="search"
            class="fancy-input"
            type="text"
            placeholder="Search or type any genre..."
            @click.stop
        />
      </div>

      <div class="content" ref="container">
        <button v-if="custom" class="button custom" @click="setGenre(custom)">
          Tune into &ldquo;{{ custom }}&rdquo;
        </button>

        <div v-for="[family, options] in grouped" :key="family" class="family">
          <p class="family-name">{{ family }}</p>
          <div class="flex flex-wrap gap-2">
            <button
                v-for="option in options"
                :key="option.name"
                class="button"
                :class="{ 'button-current': option.name === props.current }"
                @click="setGenre(option.name)"
            >
              {{ option.label }}<span v-if="option.stationCount" class="count">{{ option.stationCount }}</span>
            </button>
          </div>
        </div>

        <p v-if="!grouped.length && !custom" class="family-name">No genres match</p>
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
  width: min(560px, 92vw);
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

.search-head {
  width: 100%;
  background: #ffffff;
  padding: 16px;
  border-bottom: 3px solid #000000;
}

.content {
  padding: 12px 4px 4px;
  max-height: 46vh;
  overflow-y: auto;
  /* Keeps a wheel that reaches the end from scrolling the page behind. */
  overscroll-behavior: contain;
}

.family {
  margin-bottom: 14px;
}

.family-name {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #000;
  opacity: 0.55;
  margin-bottom: 6px;
}

.button {
  padding: 5px 10px;
  border: 3px solid #000000;
  box-shadow: 3px 3px 0 #000000;
  font-weight: 750;
  font-size: 13px;
  background: rgb(241, 90, 37);
  transition: all 0.3s ease;
  cursor: pointer;
  color: white;
}

.button:hover {
  translate: 1.5px 1.5px;
  box-shadow: 1.5px 1.5px 0 #000000;
  background: #1ac2ff;
}

.button:active {
  translate: 3px 3px;
  box-shadow: 0 0 0 #000000;
}

.button-current {
  background: #252525;
}

.custom {
  display: block;
  width: 100%;
  margin-bottom: 14px;
  background: #1ac2ff;
  color: #000;
}

.count {
  font-size: 10px;
  font-weight: 700;
  opacity: 0.75;
  margin-left: 6px;
}

.fancy-input {
  width: 100%;
  height: 52px;
  padding: 12px;
  font-size: 17px;
  font-family: "Courier New", monospace;
  color: #000;
  background-color: #fff;
  border: 4px solid #000;
  border-radius: 0;
  outline: none;
  transition: all 0.3s ease;
  box-shadow: 8px 8px 0 #000;
}

.fancy-input::placeholder {
  color: #888;
}

.fancy-input:focus {
  background-color: #010101;
  color: #fff;
  border-color: #d6d9dd;
}

.fancy-input:focus::placeholder {
  color: #fff;
}

.card:hover {
  translate: -6px;
}
</style>
