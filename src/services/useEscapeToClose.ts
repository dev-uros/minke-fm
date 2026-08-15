import {onMounted, onUnmounted} from "vue";

/**
 * Closes a modal when Escape is pressed.
 *
 * Listens on the window rather than the modal's own element, so it works while
 * a search field inside the modal has focus - which is exactly when someone is
 * most likely to want out.
 */
export function useEscapeToClose(close: () => void) {
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        // Nothing behind this modal should also act on the same press.
        event.stopPropagation();
        close();
    };

    onMounted(() => window.addEventListener('keydown', onKeyDown));
    onUnmounted(() => window.removeEventListener('keydown', onKeyDown));
}
