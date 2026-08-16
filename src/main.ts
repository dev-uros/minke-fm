import {createApp} from "vue";
import {invoke} from "@tauri-apps/api/core";
import {getCurrentWindow} from "@tauri-apps/api/window";
import './style.css'
import App from "./App.vue";
import TrayPanel from "./TrayPanel.vue";
import MobileApp from "./MobileApp.vue";

/**
 * Every window loads this bundle, so the entry point decides what it is.
 *
 * This branch is what keeps there being exactly one player: only one root
 * mounts `useStream`, so no other window can start a second stream of its own.
 *
 * Platform is asked first and the window label second. The menu bar panel is a
 * desktop-only idea, and on Android the running window reported that label,
 * which mounted the panel instead of the app.
 */
async function start() {
    const mobile = await invoke<boolean>('is_mobile').catch(() => false);
    const isTrayPanel = !mobile && getCurrentWindow().label === 'tray-panel';

    if (isTrayPanel) {
        // Marks this document so the panel's page-level styles cannot reach the
        // main window, which shares the same stylesheet.
        document.documentElement.classList.add('is-tray-panel');
    }

    if (mobile) {
        createApp(MobileApp).mount("#app");
        return;
    }

    createApp(isTrayPanel ? TrayPanel : App).mount("#app");
}

void start();
