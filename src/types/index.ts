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

export interface FormattedStation {
    name: string,
    id: string,
    url: string,
    urlResolved: string,
    country: string,
    state: string,
    type: StreamTypeEnum
}

export enum StreamTypeEnum {
    LOFI = 'lofi',
    CHILLHOP = 'chillhop',
    SYNTHWAVE = 'synthwave',
    JAZZHOP = 'jazzhop',
    VAPORWAVE = 'vaporwave',
    CHILLWAVE = 'chillwave',
    RETROWAVE = 'retrowave',
    ROCK = 'rock',
    BLUES = 'blues',
    METAL = 'metal',
    INDIE = 'indie',
    JAZZ = 'jazz'
}