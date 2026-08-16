<script setup lang="ts">
import {FormattedStation} from "../types";
import {computed, ref, watch} from "vue";
import {useRememberedScroll} from "../services/useRememberedScroll.ts";
import {useEscapeToClose} from "../services/useEscapeToClose.ts";

interface Props {
  stations: FormattedStation[]
  /** True while the genre is still being fetched, so an empty list can say so. */
  loading?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  closeModal: [],
  setStation: [station: FormattedStation],
}>()

const closeModal = () => {
  emit('closeModal');
}

useEscapeToClose(closeModal);

const setStation = (station: FormattedStation) => {
  emit('setStation', station);
}

const {container} = useRememberedScroll(() => `stations:${props.stations[0]?.type ?? ''}`);

const searchInput = ref('');
// Derived, so the list stays in sync when a dead station gets pruned while the
// modal is open.
const allStations = computed(() => {
  const query = searchInput.value.toLowerCase().trim();
  if (!query) return props.stations;
  return props.stations.filter(station =>
      station.name.toLowerCase().includes(query)
  );
})

/**
 * Only the rows on screen are rendered.
 *
 * A genre is now the entire tag rather than its most-played couple of hundred -
 * "rock" is around four and a half thousand stations - and building that many
 * buttons locks the page up for seconds every time the modal opens. Rows are a
 * fixed height and absolutely placed inside a rail of the full scroll height,
 * so the scrollbar behaves exactly as it would with all of them present.
 *
 * The fixed height is why a station name is kept to one line: names in this
 * directory run to whole sentences of tags, and letting them wrap would make
 * every row a different height and the arithmetic below impossible.
 */
const ROW_HEIGHT = 44;
const OVERSCAN = 6;

const scrollTop = ref(0);
const viewport = ref(320);

const onScroll = () => {
  const element = container.value;
  if (!element) return;
  scrollTop.value = element.scrollTop;
  viewport.value = element.clientHeight;
};

const totalHeight = computed(() => allStations.value.length * ROW_HEIGHT);

const window_ = computed(() => {
  const first = Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - OVERSCAN);
  const count = Math.ceil(viewport.value / ROW_HEIGHT) + OVERSCAN * 2;
  const last = Math.min(allStations.value.length, first + count);
  return allStations.value.slice(first, last).map((station, index) => ({
    station,
    top: (first + index) * ROW_HEIGHT
  }));
});

// Typing a query shortens the list, and a scroll position from the longer one
// would leave the modal looking empty.
watch(() => allStations.value.length, () => {
  const element = container.value;
  if (element && element.scrollTop > 0) element.scrollTop = 0;
  scrollTop.value = 0;
});
</script>

<template>
  <div class="modal-backdrop" @click="closeModal">
    <div class="card" @click.stop>
      <div class="head flex justify-between items-center">
        <span>{{ stations[0]?.type ?? 'No' }} stations ({{ allStations.length }})</span>
        <button @click="closeModal" class="btn btn-ghost btn-error btn-xs">X</button>
      </div>
      <div class="search-head flex justify-between items-center">
        <input
            v-model="searchInput"
            class="fancy-input"
            name="text"
            type="text"
            placeholder="Search radio stations..."
            @click.stop
        />
      </div>
      <div class="content" ref="container" @scroll.passive="onScroll">
        <!-- Reached by opening the list straight after playing a favourite from
             a genre that has never been browsed: the stations are on their way. -->
        <p v-if="loading && allStations.length === 0" class="note">Loading stations...</p>
        <p v-else-if="allStations.length === 0" class="note">Nothing here</p>

        <div class="rail" :style="{ height: totalHeight + 'px' }">
          <button
              v-for="row in window_"
              :key="row.station.id"
              class="button"
              :style="{ top: row.top + 'px' }"
              :title="row.station.name"
              @click="setStation(row.station)"
          >
            {{ row.station.name }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0; /* top:0; right:0; bottom:0; left:0 */
  background: rgba(0, 0, 0, 0.3); /* semi-transparent black */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999; /* ensure it appears above other content */
}

.card {
  font-family: Montserrat, sans-serif;
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
  font-family: Montserrat, sans-serif;
  font-size: 14px;
  font-weight: 900;
  width: 100%;
  height: 100px;
  background: #ffffff;
  padding: 25px;
  color: #000000;
  border-bottom: 3px solid #000000;
}

.content {
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  width: min(560px, 86vw);
  /* A fixed height rather than a max: the virtual window needs to know how much
     it is filling, and a box that grows with its contents cannot say. */
  height: min(52vh, 360px);
  /* A column of stations scrolls vertically; overflow-x only ever produced a
     stray horizontal scrollbar. */
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* Holds the full scroll height so the scrollbar matches the whole list, while
   only the visible rows exist. */
.rail {
  position: relative;
  width: 100%;
}

.note {
  margin: 6px 2px;
  font-weight: 700;
  color: #000000;
  opacity: 0.65;
}

.button {
  position: absolute;
  left: 0;
  right: 6px;
  height: 34px;
  padding: 5px 10px;
  border: 3px solid #000000;
  box-shadow: 3px 3px 0 #000000;
  font-weight: 750;
  background: rgb(241, 90, 37);
  cursor: pointer;
  color: white;
  /* One line, so every row is the same height. The full name is on the title
     attribute, and it is shown in full on the display once selected. */
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* No transition: with rows recycled as you scroll, animating their arrival
     makes the list shimmer. */
}

.button:hover {
  background: #1ac2ff;
}

.button:active {
  translate: 3px 3px;
  box-shadow: 0 0 0 #000000;
}

.card:hover {
  translate: -6px;
}

.delete-button {
  padding: 5px 10px;
  margin-top: 10px;
  border: 3px solid #000000;
  box-shadow: 3px 3px 0 #000000;
  font-weight: 750;
  background: red;
  transition: all 0.3s ease;
  cursor: pointer;
  color: white;
}

.delete-button:hover {
  translate: 1.5px 1.5px;
  box-shadow: 1.5px 1.5px 0 #000000;
  background: #1ac2ff;
}

.delete-button:active {
  translate: 3px 3px;
  box-shadow: 0 0 0 #000000;
}

/* From Uiverse.io by 0xnihilism */
.fancy-input::placeholder {
  color: #888;
}

.fancy-input:hover {
  transform: translate(-4px, -4px);
  box-shadow: 12px 12px 0 #000;
}

.fancy-input:focus {
  background-color: #000;
  color: #fff;
  border-color: #ffffff;
}

.fancy-input:focus::placeholder {
  color: #fff;
}

@keyframes typing {
  from {
    width: 0;
  }
  to {
    width: 100%;
  }
}


.fancy-input:focus::after {
  content: "|";
  position: absolute;
  right: 10px;
  animation: blink 0.7s step-end infinite;
}

.fancy-input:valid {
  animation: typing 2s steps(30, end);
}

.fancy-input-container {
  position: relative;
  width: 100%;
}

.fancy-input {
  width: 100%;
  height: 60px;
  padding: 12px;
  font-size: 18px;
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

.fancy-input:hover {
  transform: translate(-4px, -4px);
  box-shadow: 12px 12px 0 #000;
}

.fancy-input:focus {
  background-color: #010101;
  color: #fff;
  border-color: #d6d9dd;
}

.fancy-input:focus::placeholder {
  color: #fff;
}

@keyframes shake {
  0% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px) rotate(-5deg);
  }
  50% {
    transform: translateX(5px) rotate(5deg);
  }
  75% {
    transform: translateX(-5px) rotate(-5deg);
  }
  100% {
    transform: translateX(0);
  }
}

.fancy-input:focus {
  animation: shake 0.5s ease-in-out;
}


.fancy-input:not(:placeholder-shown) {
  animation: glitch 1s linear infinite;
}

.fancy-input-container::after {
  content: "|";
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #000;
  animation: blink 0.7s step-end infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.fancy-input:focus + .fancy-input-container::after {
  color: #fff;
}

.fancy-input:not(:placeholder-shown) {
  font-weight: bold;
  letter-spacing: 1px;
  text-shadow: 0px 0px 0 #000;
}

</style>