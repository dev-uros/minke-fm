import {bayer, pixels, RGB} from '../pixel';

/** A soft dithered glow of radius r, meant to be drawn with globalAlpha. */
export function glowSprite(r: number, colour: RGB, strength = 1) {
    return pixels(2 * r + 1, 2 * r + 1, put => {
        for (let y = -r; y <= r; y++) {
            for (let x = -r; x <= r; x++) {
                const d = Math.hypot(x, y) / r;
                if (d >= 1) continue;
                const v = Math.pow(1 - d, 2) * strength;
                const level = Math.min(1, Math.floor(v * 4 + bayer(x + r, y + r)) / 4);
                if (level > 0) put(x + r, y + r, colour, Math.round(level * 200));
            }
        }
    }).canvas;
}

