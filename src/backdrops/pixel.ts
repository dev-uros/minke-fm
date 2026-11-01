/**
 * Small toolkit for the pixel-art backdrops.
 *
 * Every backdrop draws into a canvas about 180px tall that CSS stretches to the
 * window with `image-rendering: pixelated`. At that size a full repaint is a
 * few hundred fillRects, so the animations stay cheap even at 30fps.
 */

export type RGB = [number, number, number];

/** A backdrop paints one frame. `beat` counts beats since start at the backdrop's bpm. */
export type Frame = (ctx: CanvasRenderingContext2D, t: number, beat: number) => void;

export interface Backdrop {
    id: string;
    name: string;
    bpm: number;
    create(width: number, height: number): Frame;
}

export const hex = (value: string): RGB => {
    const n = parseInt(value.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const css = ([r, g, b]: RGB, alpha = 1) => `rgba(${r},${g},${b},${alpha})`;

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);

/** Ordered-dither threshold for a pixel, 0..1. */
export const bayer = (x: number, y: number) => BAYER4[(y & 3) * 4 + (x & 3)];

/** Picks from a palette at position t (0..1), dithered so neighbouring colours blend. */
export function ditherPick(palette: RGB[], t: number, x: number, y: number): RGB {
    const p = Math.min(Math.max(t, 0), 1) * (palette.length - 1);
    const i = Math.floor(p);
    return palette[Math.min(i + (p - i > bayer(x, y) ? 1 : 0), palette.length - 1)];
}

/** Seeded random, so a scene keeps its layout when the window is resized. */
export function rng(seed: number) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Deterministic 0..1 hash of two numbers, for flicker that needs no state. */
export const hash = (a: number, b: number) => {
    const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return s - Math.floor(s);
};

/** Sharp pulse on every beat, 1 on the beat decaying to 0. */
export const pulse = (beat: number) => Math.pow(1 - (beat - Math.floor(beat)), 3);

export function canvas(width: number, height: number) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return {canvas: c, ctx};
}

/** Builds an offscreen layer pixel by pixel. Pixels left unset stay transparent. */
export function pixels(width: number, height: number,
                       paint: (put: (x: number, y: number, c: RGB, a?: number) => void) => void) {
    const {canvas: c, ctx} = canvas(width, height);
    const img = ctx.createImageData(width, height);
    const put = (x: number, y: number, [r, g, b]: RGB, a = 255) => {
        x = Math.round(x);
        y = Math.round(y);
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const i = (y * width + x) * 4;
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = b;
        img.data[i + 3] = a;
    };
    paint(put);
    ctx.putImageData(img, 0, 0);
    return {canvas: c, ctx};
}

/** Filled pixel circle. */
export function disc(put: (x: number, y: number, c: RGB) => void, cx: number, cy: number, r: number,
                     colour: (x: number, y: number) => RGB) {
    for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
            if (x * x + y * y <= r * r + r * 0.6) put(cx + x, cy + y, colour(cx + x, cy + y));
        }
    }
}

/** Value noise that wraps horizontally, so a layer can scroll forever. */
export function wrappingNoise(width: number, height: number, cell: number, random: () => number) {
    const gx = Math.max(1, Math.round(width / cell));
    const sx = width / gx;
    const gy = Math.ceil(height / cell) + 2;
    const grid = Array.from({length: gx * gy}, random);
    const smooth = (v: number) => v * v * (3 - 2 * v);
    return (x: number, y: number) => {
        const fx = x / sx, fy = y / cell;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        const tx = smooth(fx - ix), ty = smooth(fy - iy);
        const at = (i: number, j: number) => grid[(((i % gx) + gx) % gx) + Math.min(j, gy - 1) * gx];
        const top = at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx;
        const bottom = at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx;
        return top * (1 - ty) + bottom * ty;
    };
}
