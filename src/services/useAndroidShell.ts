import {onMounted, onUnmounted} from "vue";
import {dismissTopmost} from "./useDismissable.ts";

/**
 * The bridge `MainActivity` installs on the webview.
 *
 * Declared loosely because it only exists on Android: on the desktop build the
 * object is simply absent, and every call site checks first.
 */
interface MinkeShell {
    ready(): void;

    exit(): void;
}

declare global {
    interface Window {
        MinkeShell?: MinkeShell;
    }
}

let announced = false;

/**
 * Tells the shell the interface is on screen.
 *
 * A frame callback is preferred, so the splash lifts onto a painted screen
 * rather than a page that has merely mounted. But it cannot be waited on
 * alone: a webview covered by the splash is never asked to paint, so the frame
 * callback never runs - the splash waits for the page while the page waits to
 * become visible. That deadlock is intermittent, which makes it worse; it
 * survived one round of testing before wedging on the next.
 *
 * The timer always fires, so whichever comes first wins.
 */
export function announceReady() {
    const tell = () => {
        if (announced) return;
        announced = true;
        window.MinkeShell?.ready();
    };

    requestAnimationFrame(tell);
    setTimeout(tell, PAINT_GRACE_MS);
}

const PAINT_GRACE_MS = 120;

export function exitApp() {
    window.MinkeShell?.exit();
}

/**
 * Hardware back.
 *
 * One press closes whatever is on top. With nothing open the first press only
 * warns, and the second asks - leaving on a single stray press is how you lose
 * the station you were listening to.
 *
 * `onWarn` shows the hint, `onConfirm` opens the dialog. The activity never
 * finishes on its own: `MainActivity` swallows every press and defers here.
 */
const DOUBLE_PRESS_MS = 2000;

export function useAndroidBack(onWarn: () => void, onConfirm: () => void) {
    let lastPress = 0;

    const onBack = () => {
        // A modal is open: back means "close it", nothing more.
        if (dismissTopmost()) {
            lastPress = 0;
            return;
        }

        const now = Date.now();
        if (now - lastPress < DOUBLE_PRESS_MS) {
            lastPress = 0;
            onConfirm();
            return;
        }

        lastPress = now;
        onWarn();
    };

    onMounted(() => window.addEventListener('android:back', onBack));
    onUnmounted(() => window.removeEventListener('android:back', onBack));
}
