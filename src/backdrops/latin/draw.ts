import type {RGB} from '../pixel';

/** Small helpers shared by the latin backdrops. */

export const mix = (a: RGB, b: RGB, f: number): RGB =>
    [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];

export const shade = (c: RGB, f: number): RGB =>
    [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f)];

/** Filled ellipse made of horizontal runs, no anti-aliasing. */
export function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
    for (let y = -ry; y <= ry; y++) {
        const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + ry * 0.6))));
        if (half > 0) ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
    }
}
