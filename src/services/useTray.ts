import {onUnmounted, watch, WatchSource} from "vue";
import {invoke} from "@tauri-apps/api/core";
import {listen, UnlistenFn} from "@tauri-apps/api/event";

/**
 * Keeps the menu bar panel in step with the window, in both directions.
 *
 * The panel is a separate webview with none of the player's state, and is kept
 * that way deliberately: it receives what to show, and its buttons call the very
 * functions the cassette buttons call. Playback state living in two webviews is
 * how a panel ends up saying "Play" while the window says "Pause" - or worse,
 * how a second player gets started.
 */

export interface TrayState {
    station: string | null;
    track: string | null;
    artist: string | null;
    song: string | null;
    artwork: string | null;
    genre: string;
    playing: boolean;
    shuffle: boolean;
    favourite: boolean;
}

/** Everything the panel can ask for. Window and quit are handled in Rust. */
export interface TrayActions {
    playPause: () => void;
    next: () => void;
    previous: () => void;
    toggleShuffle: () => void;
    toggleFavourite: () => void;
}

export function useTray(state: WatchSource<TrayState>, actions: TrayActions) {
    const unlisteners: UnlistenFn[] = [];

    void listen<string>('tray:action', event => {
        switch (event.payload) {
            case 'play-pause':
                actions.playPause();
                break;
            case 'next':
                actions.next();
                break;
            case 'previous':
                actions.previous();
                break;
            case 'shuffle':
                actions.toggleShuffle();
                break;
            case 'favourite':
                actions.toggleFavourite();
                break;
        }
    }).then(un => unlisteners.push(un));

    // `immediate` so the menu is correct from the first frame rather than only
    // after something happens to change.
    watch(
        state,
        value => {
            void invoke('update_tray', {state: value}).catch(() => undefined);
        },
        {immediate: true, deep: true}
    );

    onUnmounted(() => {
        while (unlisteners.length) unlisteners.pop()!();
    });
}
