import {FormattedStation} from "../types";

export function getRandomStation(
    stations: FormattedStation[],
    lastStationId: string
): FormattedStation {
    if (stations.length === 0) return null;

    // Filter out the last station if there's more than one option
    let availableStations = stations;
    if (stations.length > 1 && lastStationId) {
        availableStations = stations.filter(station => station.id !== lastStationId);
    }

    const randomIndex = Math.floor(Math.random() * availableStations.length);
    return availableStations[randomIndex];
}

