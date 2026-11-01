import {ref, watch} from "vue";

/**
 * The phone's themes.
 *
 * A skin is one choice that changes everything at once - colours, type, the
 * modals and the player itself - rather than a set of separate settings. The
 * colours live in `src/skins.css` under `html[data-skin=...]`; the shared
 * modals read them as `var(--m-*, <original>)`, so the desktop, which never sets
 * the attribute, keeps its exact look.
 *
 * Every skin keeps a dark background behind the system bars: iOS has the light
 * status bar style fixed in Info.plist, and Android draws light icons.
 */
export type SkinId = 'cassette' | 'radio' | 'vinyl' | 'hifi' | 'lcd';

export interface Skin {
    id: SkinId;
    name: string;
    blurb: string;
    /** Background, panel, accent, second accent - for the picker's swatches. */
    swatch: [string, string, string, string];
}

export const SKINS: Skin[] = [
    {id: 'cassette', name: 'Cassette', blurb: 'The original mixtape deck', swatch: ['#1a1a1a', '#252525', 'rgb(242, 188, 0)', 'rgb(241, 90, 37)']},
    {id: 'radio', name: 'Transistor', blurb: 'Walnut cabinet, glowing tuning dial', swatch: ['#23160d', '#eadcbd', '#e0912f', '#a8321e']},
    {id: 'vinyl', name: 'Turntable', blurb: 'A record spinning on green felt', swatch: ['#0f2a22', '#143a2e', '#c9a45c', '#e8a87c']},
    {id: 'hifi', name: 'Hi-fi', blurb: 'Nineties tuner with a glowing display', swatch: ['#0b0b0c', '#04110f', '#5ff5d2', '#ffb347']},
    {id: 'lcd', name: 'Pocket LCD', blurb: 'Four shades of green, chunky pixels', swatch: ['#1f2326', '#c7d3a0', '#4e5a3a', '#1e2416']},
];

const STORAGE_KEY = 'minke:skin';

const isSkin = (value: unknown): value is SkinId =>
    SKINS.some(skin => skin.id === value);

const read = (): SkinId => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (isSkin(saved)) return saved;
    } catch {
        // Storage can be unavailable; the default is fine.
    }
    return 'cassette';
};

/** Module-level, so every caller shares one value. */
const skin = ref<SkinId>(read());

/**
 * Applied on first use rather than at import: `main.ts` imports the phone root
 * on every platform, and the desktop must never get the attribute.
 */
let applying = false;

export function useSkin() {
    if (!applying) {
        applying = true;
        watch(skin, value => {
            document.documentElement.dataset.skin = value;
            try {
                localStorage.setItem(STORAGE_KEY, value);
            } catch {
                // Not remembered across launches, but it still applies now.
            }
        }, {immediate: true});
    }

    return {
        skin,
        setSkin: (id: SkinId) => (skin.value = id),
    };
}
