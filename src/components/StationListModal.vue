<script setup lang="ts">
import {FormattedStation} from "../types";
import {ref, watch} from "vue";

interface Props {
  stations: FormattedStation[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  closeModal: [],
  setStation: [station: FormattedStation],
}>()

const closeModal = () => {
  emit('closeModal');
}

const setStation = (station: FormattedStation) => {
  emit('setStation', station);
}

const searchInput = ref('');
const allStations = ref(props.stations)
watch(searchInput, (value) => {
  const query = value.toLowerCase().trim();
  if (!query) {
    allStations.value = props.stations;
  } else {
    allStations.value = props.stations.filter(station =>
        station.name.toLowerCase().includes(query)
    );
  }
})
</script>

<template>
  <div class="modal-backdrop" @click="closeModal">
    <div class="card" @click.stop>
      <div class="head flex justify-between items-center">
        <span>{{ stations[0].type }} stations</span>
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
      <div class="content flex flex-col gap-3">
        <div
            v-for="station in allStations"
            :key="station.id"
            class="flex items-center gap-2"
        >
          <button
              class="button flex-1"
              @click="setStation(station)"
          >
            {{ station.name }}
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
  max-width: 500px;
  width: 500px;
  max-height: 300px;
  overflow-x: scroll;
}

.button {
  padding: 5px 10px;
  margin-top: 10px;
  border: 3px solid #000000;
  box-shadow: 3px 3px 0 #000000;
  font-weight: 750;
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