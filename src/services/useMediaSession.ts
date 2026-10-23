import {onUnmounted, watch, WatchSource} from "vue";

/**
 * The keyboard's media keys, headphone buttons and the macOS Now Playing widget.
 *
 * Desktop only: on Android the Kotlin player owns the MediaSession, and a
 * second one from the webview would fight it for the lock screen.
 *
 * Like the tray, this only displays state and calls back into the same
 * functions the cassette buttons use - it never touches the player itself.
 */

export interface MediaSessionState {
    station: string | null;
    genre: string;
    artist: string | null;
    song: string | null;
    album: string | null;
    artwork: string | null;
    playing: boolean;
}

export interface MediaSessionActions {
    playPause: () => void;
    next: () => void;
    previous: () => void;
}

const ACTIONS: MediaSessionAction[] = ['play', 'pause', 'nexttrack', 'previoustrack'];

export function useMediaSession(state: WatchSource<MediaSessionState>, actions: MediaSessionActions) {
    if (!('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;

    // Play and pause both go through the toggle, so a key press always does
    // what the cassette's button would, whatever the reconnect logic is up to.
    const handlers: Record<string, () => void> = {
        play: actions.playPause,
        pause: actions.playPause,
        nexttrack: actions.next,
        previoustrack: actions.previous
    };
    for (const action of ACTIONS) {
        try {
            session.setActionHandler(action, handlers[action]);
        } catch {
            // An action this WebKit does not know - the others still work.
        }
    }

    watch(
        state,
        value => {
            session.playbackState = value.playing ? 'playing' : 'paused';

            if (!value.station) {
                session.metadata = null;
                return;
            }

            // A confirmed track shows as the song, with the station underneath;
            // otherwise the station is all there is to show.
            session.metadata = new MediaMetadata(
                value.song && value.artist
                    ? {
                        title: value.song,
                        artist: value.artist,
                        album: value.album ?? value.station,
                        artwork: value.artwork ? [{src: value.artwork}] : []
                    }
                    : {title: value.station, artist: value.genre}
            );
        },
        {immediate: true, deep: true}
    );

    onUnmounted(() => {
        for (const action of ACTIONS) {
            try {
                session.setActionHandler(action, null);
            } catch {
                // Same as above.
            }
        }
        session.metadata = null;
    });
}
