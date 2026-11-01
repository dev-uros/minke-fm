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

export interface Palm {
    x: number;
    base: number;
    height: number;
    /** Horizontal offset of the crown from the base. */
    lean: number;
    frond: number;
    girth: number;
    phase: number;
}

const FRONDS = [3.35, -2.75, -2.15, -1.6, -1.0, -0.4, 0.2];

/**
 * A palm silhouette drawn with fillRects: a curved trunk and drooping fronds
 * with hanging leaflets, all swaying a little with the wind.
 */
export function drawPalm(ctx: CanvasRenderingContext2D, p: Palm, t: number, colour: string,
                         ring: string | null = null, wind = 1) {
    const sway = (Math.sin(t * 0.7 + p.phase) * 2 + Math.sin(t * 1.9 + p.phase * 2) * 0.6) * wind;
    ctx.fillStyle = colour;
    let topX = p.x;
    const topY = p.base - p.height;
    for (let i = 0; i <= p.height; i++) {
        const s = i / p.height;
        const x = p.x + p.lean * s * s + sway * s * s * s;
        const w = Math.max(2, Math.round(p.girth - s * (p.girth - 2)));
        ctx.fillRect(Math.round(x - w / 2), p.base - i, w, 1);
        topX = x;
    }
    if (ring) {
        ctx.fillStyle = ring;
        for (let i = 4; i < p.height - 4; i += 4) {
            const s = i / p.height;
            const x = p.x + p.lean * s * s + sway * s * s * s;
            const w = Math.max(2, Math.round(p.girth - s * (p.girth - 2)));
            ctx.fillRect(Math.round(x - w / 2), p.base - i, w - 1, 1);
        }
        ctx.fillStyle = colour;
    }
    const L = p.frond;
    for (let f = 0; f < FRONDS.length; f++) {
        const a = FRONDS[f] + Math.sin(t * 1.3 + p.phase + f) * 0.05 * wind + sway * 0.02;
        const droop = 0.55 + 0.25 * Math.abs(Math.cos(a));
        const len = L * (f === 0 || f === FRONDS.length - 1 ? 0.85 : 1);
        for (let k = 1; k <= len; k++) {
            const s = k / len;
            const x = Math.round(topX + Math.cos(a) * s * len);
            const y = Math.round(topY + Math.sin(a) * s * len + droop * s * s * len);
            ctx.fillRect(x, y, s < 0.5 ? 2 : 1, s < 0.3 ? 2 : 1);
            if (k % 2 === 0 && s > 0.15) {
                const leaf = Math.max(1, Math.round((1 - s * 0.6) * len * 0.2));
                const flick = Math.round(Math.sin(t * 2.2 + k * 0.7 + p.phase) * 0.6 * wind);
                ctx.fillRect(x + flick, y + 1, 1, leaf);
            }
        }
    }
    ctx.fillRect(Math.round(topX) - 2, topY - 1, 5, 3);
    ctx.fillRect(Math.round(topX) - 3, topY + 1, 2, 2);
    ctx.fillRect(Math.round(topX) + 2, topY + 1, 2, 2);
}
