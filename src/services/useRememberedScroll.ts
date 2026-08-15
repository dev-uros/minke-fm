import {nextTick, onBeforeUnmount, onMounted, ref, Ref} from "vue";

/**
 * Keeps a modal's scroll position across open and close.
 *
 * Modals are mounted with `v-if`, so closing one destroys it and takes its
 * scroll offset with it - scroll to the end of the genre list, close, reopen,
 * and you are back at the top. The offsets live here, outside any component,
 * so they survive that.
 *
 * Keys are chosen by the caller: a fixed name where the content is stable, or
 * one derived from the content where it is not (lyrics for a different song
 * should start at the top, not halfway down the previous one).
 */
/** Frames to wait for a container to become scrollable before giving up. */
const RESTORE_ATTEMPTS = 10;

const positions = new Map<string, number>();

export function useRememberedScroll(key: () => string) {
    const container: Ref<HTMLElement | undefined> = ref();

    const save = () => {
        if (container.value) positions.set(key(), container.value.scrollTop);
    };

    /**
     * Restores once there is actually something to scroll.
     *
     * `nextTick` alone is not enough: it fires when Vue has patched the DOM,
     * which can still be before the stylesheet has been applied. Measured on a
     * cold start, the container reported `overflow: visible` and no max-height
     * at that point, so setting scrollTop silently did nothing. Retrying across
     * a few frames costs nothing and removes the whole class of problem.
     */
    const restore = (attemptsLeft = RESTORE_ATTEMPTS) => {
        void nextTick(() => {
            requestAnimationFrame(() => {
                const element = container.value;
                if (!element) return;

                const wanted = positions.get(key()) ?? 0;
                if (wanted === 0) return;

                if (element.scrollHeight <= element.clientHeight) {
                    // Nothing to scroll yet - styles or content still settling.
                    if (attemptsLeft > 0) restore(attemptsLeft - 1);
                    return;
                }

                element.scrollTop = wanted;
            });
        });
    };

    onMounted(restore);
    // Runs while the element is still in the DOM, so scrollTop is still readable.
    onBeforeUnmount(save);

    return {container, save, restore};
}

/** Forgets a remembered position, for content that has genuinely gone away. */
export function forgetScroll(key: string) {
    positions.delete(key);
}
