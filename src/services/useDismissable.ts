import {onMounted, onUnmounted} from "vue";

/**
 * A register of the overlays currently on screen, newest last.
 *
 * Both Escape and Android's back button mean "close what I am looking at", and
 * neither can answer that from a single modal's own scope: the modals are
 * siblings driven by separate flags, so each one only knows about itself. With
 * a shared stack the topmost is simply the last entry.
 *
 * Module-level on purpose - the whole point is that it outlives any one modal.
 */
const stack: Array<() => void> = [];

export function useDismissable(close: () => void) {
    onMounted(() => stack.push(close));
    onUnmounted(() => {
        const index = stack.lastIndexOf(close);
        if (index !== -1) stack.splice(index, 1);
    });
}

/** True when `close` is the overlay on top, so only it reacts to a keypress. */
export function isTopmost(close: () => void): boolean {
    return stack.length > 0 && stack[stack.length - 1] === close;
}

/**
 * Closes the overlay on top. Returns false when nothing is open, which is how
 * the caller knows the press was meant for something else.
 */
export function dismissTopmost(): boolean {
    const close = stack[stack.length - 1];
    if (!close) return false;
    close();
    return true;
}
