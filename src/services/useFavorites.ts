import {ref, Ref} from "vue";
import {FormattedStation} from "../types";

/**
 * Saved stations, shared by the desktop and mobile roots.
 *
 * Module-level rather than per-component: both roots never run at once, but the
 * list has to survive the modals that read it being destroyed and remade.
 */

const STORAGE_KEY = 'favorites';

const favorites: Ref<FormattedStation[]> = ref([]);
let loaded = false;

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites.value));
    } catch {
        // Quota or private mode - the list still works for this session.
    }
}

export function useFavorites() {
    if (!loaded) {
        loaded = true;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) favorites.value = JSON.parse(stored) as FormattedStation[];
        } catch {
            favorites.value = [];
        }
    }

    const isFavorite = (station: FormattedStation | null) =>
        !!station && favorites.value.some(saved => saved.id === station.id);

    /** Returns what happened, so the caller can word its own message. */
    const toggle = (station: FormattedStation | null): 'added' | 'removed' | null => {
        if (!station) return null;

        const index = favorites.value.findIndex(saved => saved.id === station.id);
        if (index === -1) {
            favorites.value.unshift(station);
            persist();
            return 'added';
        }

        favorites.value.splice(index, 1);
        persist();
        return 'removed';
    };

    const remove = (station: FormattedStation) => {
        const index = favorites.value.findIndex(saved => saved.id === station.id);
        if (index === -1) return;
        favorites.value.splice(index, 1);
        persist();
    };

    return {favorites, isFavorite, toggle, remove};
}
