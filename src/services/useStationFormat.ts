import {FormattedStation, Station, StreamTypeEnum} from "../types";

export function formatStations(stations: Station[], type: StreamTypeEnum): FormattedStation[] {
    return stations.map(station => {
        return {
            name: station.name,
            id: station.stationuuid,
            url: station.url,
            urlResolved: station.url_resolved,
            country: station.country,
            state: station.state,
            type
        }
    });
}