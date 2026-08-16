import {onMounted, onUnmounted} from "vue";
import {isTopmost, useDismissable} from "./useDismissable.ts";

/**
 * Closes a modal when Escape is pressed.
 *
 * Listens on the window rather than the modal's own element, so it works while
 * a search field inside the modal has focus - which is exactly when someone is
 * most likely to want out.
 *
 * Registering in the shared stack keeps one press from closing every open
 * modal at once: each listener fires, but only the topmost acts. Modals opened
 * from inside another modal are the case that needs it.
 */
export function useEscapeToClose(close: () => void) {
    useDismissable(close);

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        if (!isTopmost(close)) return;
        // Nothing behind this modal should also act on the same press.
        event.stopPropagation();
        close();
    };

    onMounted(() => window.addEventListener('keydown', onKeyDown));
    onUnmounted(() => window.removeEventListener('keydown', onKeyDown));
}
