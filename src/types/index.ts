export interface Station {
    changeuuid: string;
    stationuuid: string;
    name: string;
    url: string;
    url_resolved: string;
    homepage: string;
    favicon: string;
    tags: string;
    country: string;
    countrycode: string;
    state: string;
    language: string;
    languagecodes: string;
    votes: number;
    lastchangetime: string;
    lastchangetime_iso8601: string;
    codec: string;
    bitrate: number;
    hls: number;
    lastcheckok: number;
    lastchecktime: string;
    lastchecktime_iso8601: string;
    lastcheckoktime: string;
    lastcheckoktime_iso8601: string;
    lastlocalchecktime: string;
    lastlocalchecktime_iso8601: string;
    clicktimestamp: string;
    clicktimestamp_iso8601: string;
    clickcount: number;
    clicktrend: number;
}

/**
 * A radio-browser tag, lowercase. Any tag is playable, so this is a plain
 * string rather than a fixed set - the catalogue in `useGenres.ts` is only the
 * browsable selection, not the limit of what can be tuned into.
 */
export type Genre = string;

export interface FormattedStation {
    name: string,
    id: string,
    url: string,
    urlResolved: string,
    country: string,
    state: string,
    /** The genre this station was found under. */
    type: Genre
}

/** One entry in the browsable genre catalogue. */
export interface GenreOption {
    name: Genre;
    /** Display name, since tags are all lowercase. */
    label: string;
    family: string;
    /** Stations the directory reports, once counts have loaded. */
    stationCount?: number;
}
