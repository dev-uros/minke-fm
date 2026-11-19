<script setup lang="ts">
import {computed, onMounted, ref} from "vue";
import {Genre, GenreOption} from "../types";
import {normalizeGenreInput, useGenres} from "../services/useGenres.ts";
import {countryGenre, isCountryGenre, useCountries} from "../services/useCountries.ts";
import {searchBy} from "../services/search.ts";
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
const {countries, loading: countriesLoading, failed: countriesFailed, loadCountries, spin} = useCountries();

/** Genres or countries; opens on whichever is playing now. */
const tab = ref<'genres' | 'countries'>(isCountryGenre(props.current) ? 'countries' : 'genres');
const {container, restore} = useRememberedScroll(() => tab.value);

onMounted(async () => {
  if (tab.value === 'countries') await loadCountries();
  else await loadCounts();
  // Counts re-sort the list, which moves everything under the restored offset,
  // so the position has to be put back once the final order is in.
  restore();
});

const showTab = async (next: 'genres' | 'countries') => {
  if (tab.value === next) return;
  tab.value = next;
  search.value = '';
  if (next === 'countries') await loadCountries();
  else await loadCounts();
  restore();
};

/** "Spin the globe": somewhere at random, with enough stations to be worth the trip. */
const spinGlobe = () => {
  const country = spin(props.current);
  if (country) setGenre(countryGenre(country.code));
};

const search = ref('');

const countryMatches = computed(() =>
    searchBy(countries.value, search.value, option => [option.name, option.code, ...option.aliases]));

const matches = computed(() => searchBy(genres.value, search.value, option => [option.label, option.name]));

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
        <span>{{ tab === 'countries' ? 'Tune around the world' : 'Switch genre' }}</span>
        <button @click="closeModal" class="btn btn-ghost btn-error btn-xs">X</button>
      </div>

      <div class="search-head">
        <div class="source-tabs" role="tablist">
          <button role="tab" class="source-tab" :aria-selected="tab === 'genres'" @click="showTab('genres')">Genres</button>
          <button role="tab" class="source-tab" :aria-selected="tab === 'countries'" @click="showTab('countries')">Countries</button>
        </div>
        <!-- Not v-model: it waits for a phone keyboard to finish the word. -->
        <input
            :value="search"
            @input="search = ($event.target as HTMLInputElement).value"
            class="fancy-input"
            type="text"
            :placeholder="tab === 'countries' ? 'Search a country...' : 'Search or type any genre...'"
            @click.stop
        />
      </div>

      <div v-if="tab === 'countries'" class="content" ref="container">
        <button class="button custom spin" :disabled="!countries.length" @click="spinGlobe">
          <svg class="globe" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/></svg>
          Spin the globe
        </button>
        <p v-if="countriesLoading" class="family-name">Loading countries...</p>
        <p v-else-if="countriesFailed" class="family-name">
          The station directory is not answering. <a class="retry" @click="loadCountries">Try again</a>
        </p>
        <div class="flex flex-wrap gap-2">
          <button
              v-for="option in countryMatches"
              :key="option.code"
              class="button"
              :class="{ 'button-current': countryGenre(option.code) === props.current }"
              :title="option.name"
              @click="setGenre(countryGenre(option.code))"
          >
            <span class="code" aria-hidden="true">{{ option.code }}</span>{{ option.name }}<span class="count">{{ option.stationCount }}</span>
          </button>
        </div>
        <p v-if="!countriesLoading && !countriesFailed && !countryMatches.length" class="family-name">No countries match</p>
      </div>

      <div v-else class="content" ref="container">
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
/* A long press on a button is a slow tap, not a request to select its words. */
button {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}

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
  font-family: var(--m-font, Montserrat, sans-serif);
  width: min(560px, 92vw);
  translate: -6px -6px;
  background: var(--m-card, rgb(242, 188, 0));
  border: var(--m-bw, 3px) solid var(--m-line, #000);
  box-shadow: var(--m-shadow-lg, 12px 12px 0 #000);
  overflow: hidden;
  transition: all 0.3s ease;
  padding: 20px;
  border-radius: var(--m-radius, 0);
}

.head {
  font-family: var(--m-font, Montserrat, sans-serif);
  font-size: 14px;
  font-weight: 900;
  width: 100%;
  height: 32px;
  background: var(--m-head, #ffffff);
  padding: 5px 12px;
  color: var(--m-head-fg, #000000);
  border-bottom: var(--m-bw, 3px) solid var(--m-line, #000);
}

.search-head {
  width: 100%;
  background: var(--m-head, #ffffff);
  padding: 16px;
  border-bottom: var(--m-bw, 3px) solid var(--m-line, #000);
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
  color: var(--m-ink, #000);
  opacity: 0.55;
  margin-bottom: 6px;
}

.button {
  padding: 5px 10px;
  border: var(--m-bw, 3px) solid var(--m-line, #000);
  box-shadow: var(--m-shadow-sm, 3px 3px 0 #000);
  font-weight: 750;
  font-size: 13px;
  background: var(--m-btn, rgb(241, 90, 37));
  transition: all 0.3s ease;
  cursor: pointer;
  color: var(--m-btn-fg, white);
  border-radius: var(--m-radius-sm, 0);
}

.button:hover {
  translate: 1.5px 1.5px;
  box-shadow: var(--m-shadow-sm, 1.5px 1.5px 0 #000);
  background: var(--m-btn-hover, #1ac2ff);
}

.button:active {
  translate: 3px 3px;
  box-shadow: 0 0 0 #000000;
}

.button-current {
  background: var(--m-btn-current, #252525);
}

/* The one highlighted button (Spin the globe, Tune into "..."): the skin's own accent with
   text chosen for it. It used to borrow the hover colour with black text, which on the
   darker skins was black on dark brown, green or charcoal. */
.custom,
.custom:hover {
  display: block;
  width: 100%;
  margin-bottom: 14px;
  background: var(--m-spin, #1ac2ff);
  color: var(--m-spin-fg, #000);
}

.source-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.source-tab {
  flex: 1;
  padding: 6px 10px;
  border: var(--m-bw, 3px) solid var(--m-line, #000);
  border-radius: var(--m-radius-sm, 0);
  background: transparent;
  color: var(--m-head-fg, #000);
  font-family: inherit;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}

.source-tab[aria-selected="true"] {
  background: var(--m-btn, rgb(241, 90, 37));
  color: var(--m-btn-fg, white);
  box-shadow: var(--m-shadow-sm, 3px 3px 0 #000);
}

.spin:disabled {
  opacity: 0.5;
  cursor: default;
}

.retry {
  text-decoration: underline;
  cursor: pointer;
}

/* The country's code in a little box, as on a tuner's preset: flags are emoji, which
   Windows draws as two letters anyway and some webviews not at all. */
.code {
  display: inline-block;
  min-width: 2.4em;
  margin-right: 7px;
  padding: 0 3px;
  border: 1.5px solid currentColor;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.5px;
  line-height: 1.5;
  text-align: center;
  opacity: 0.85;
}

.spin {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.globe {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
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
  font-family: var(--m-font-input, "Courier New", monospace);
  color: var(--m-input-fg, #000);
  background-color: var(--m-input, #fff);
  border: 4px solid var(--m-line, #000);
  border-radius: 0;
  outline: none;
  transition: all 0.3s ease;
  box-shadow: var(--m-shadow-md, 8px 8px 0 #000);
}

.fancy-input::placeholder {
  color: var(--m-input-ph, #888);
}

.fancy-input:focus {
  background-color: var(--m-input-focus, #010101);
  color: var(--m-input-focus-fg, #fff);
  border-color: var(--m-input-ring, #d6d9dd);
}

.fancy-input:focus::placeholder {
  color: var(--m-input-focus-fg, #fff);
}

.card:hover {
  translate: -6px;
}
</style>
