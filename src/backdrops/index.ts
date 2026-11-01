import type {Backdrop} from './pixel';
import {LOFI} from './lofi';
import {AMBIENT} from './ambient';
import {SYNTHWAVE} from './synthwave';
import {ROCK} from './rock';
import {METAL} from './metal';
import {ELECTRONIC} from './electronic';
import {JAZZ} from './jazz';
import {BLUES} from './blues';
import {CLASSICAL} from './classical';
import {HIPHOP} from './hiphop';
import {POP} from './pop';
import {COUNTRY} from './country';
import {FOLK} from './folk';
import {REGGAE} from './reggae';
import {LATIN} from './latin';
import {WORLD} from './world';
import {GOSPEL} from './gospel';
import {SCREEN} from './screen';
import {ERAS} from './eras';

export type {Backdrop} from './pixel';

/**
 * Animated backdrops per scene (see `SCENES` in useBackgroundVideo.ts), one
 * folder per scene. Each backdrop in a scene is a different picture, not a
 * recolour of another. A scene with no backdrops falls back to stock footage.
 */
export const BACKDROPS: Record<string, Backdrop[]> = {
    lofi: LOFI,
    ambient: AMBIENT,
    synthwave: SYNTHWAVE,
    rock: ROCK,
    metal: METAL,
    electronic: ELECTRONIC,
    jazz: JAZZ,
    blues: BLUES,
    classical: CLASSICAL,
    hiphop: HIPHOP,
    pop: POP,
    country: COUNTRY,
    folk: FOLK,
    reggae: REGGAE,
    latin: LATIN,
    world: WORLD,
    gospel: GOSPEL,
    screen: SCREEN,
    eras: ERAS,
};

/** A random backdrop for the scene, never the one already showing. */
export function pickBackdrop(scene: string, current: Backdrop | null): Backdrop | null {
    const list = BACKDROPS[scene];
    if (!list?.length) return null;
    const options = list.filter(b => b.id !== current?.id);
    return options.length ? options[Math.floor(Math.random() * options.length)] : list[0];
}
