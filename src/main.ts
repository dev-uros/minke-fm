import {createApp} from "vue";
import {getCurrentWindow} from "@tauri-apps/api/window";
import './style.css'
import App from "./App.vue";
import TrayPanel from "./TrayPanel.vue";

/**
 * Both windows load this bundle, so the entry point decides which one it is.
 *
 * This branch is what keeps there being exactly one player: only App mounts
 * `useStream`, so the tray panel cannot accidentally start a second stream of
 * its own.
 */
const isTrayPanel = getCurrentWindow().label === 'tray-panel';

if (isTrayPanel) {
    // Marks this document so the panel's page-level styles cannot reach the
    // main window, which shares the same stylesheet.
    document.documentElement.classList.add('is-tray-panel');
}

createApp(isTrayPanel ? TrayPanel : App).mount("#app");
