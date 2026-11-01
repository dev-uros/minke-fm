/** A lit window that flickers on and off on its own slow schedule. */
export interface LitWindow {
    x: number;
    y: number;
    w: number;
    h: number;
    colour: string;
    period: number;
    seed: number;
}

export interface SkylineOptions {
    from: number;
    to: number;
    base: number;
    minHeight: number;
    maxHeight: number;
    minWidth: number;
    maxWidth: number;
    colour: string;
    lit: string[];
    litChance: number;
    /** Window spacing: [step x, step y, window w, window h]. */
    grid?: [number, number, number, number];
}

/**
 * Draws a row of buildings and returns their lit windows, which the caller
 * paints per frame so they can flicker. Buildings never cross `to`, so a strip
 * built from 0 to its width tiles without a seam.
 */
export function skyline(ctx: CanvasRenderingContext2D, o: SkylineOptions, random: () => number): LitWindow[] {
    const windows: LitWindow[] = [];
    const [stepX, stepY, ww, wh] = o.grid ?? [3, 4, 1, 2];
    let x = o.from;

    while (x < o.to) {
        const w = Math.min(Math.round(o.minWidth + random() * (o.maxWidth - o.minWidth)), o.to - x);
        const h = Math.round(o.minHeight + random() * (o.maxHeight - o.minHeight));
        const top = o.base - h;

        ctx.fillStyle = o.colour;
        ctx.fillRect(x, top, w, h + 1);
        // Some roofs get a little antenna or a stepped top.
        if (random() < 0.25 && w > 6) ctx.fillRect(x + Math.floor(w / 2), top - 4, 1, 4);
        if (random() < 0.2 && w > 10) ctx.fillRect(x + 2, top - 2, w - 4, 2);

        for (let wy = top + 3; wy < o.base - 3; wy += stepY) {
            for (let wx = x + 2; wx < x + w - 2; wx += stepX) {
                if (random() < o.litChance) {
                    windows.push({
                        x: wx, y: wy, w: ww, h: wh,
                        colour: o.lit[Math.floor(random() * o.lit.length)],
                        period: 4 + random() * 20,
                        seed: random() * 1000
                    });
                }
            }
        }
        x += w + (random() < 0.3 ? Math.round(random() * 3) : 0);
    }
    return windows;
}

/** Paints lit windows; roughly one in six is off at any moment, and they change slowly. */
export function paintWindows(ctx: CanvasRenderingContext2D, windows: LitWindow[], t: number, offsetX = 0) {
    for (const w of windows) {
        const slot = Math.floor((t + w.seed) / w.period);
        const s = Math.sin(w.seed * 12.9898 + slot * 78.233) * 43758.5453;
        if (s - Math.floor(s) < 0.16) continue;
        ctx.fillStyle = w.colour;
        ctx.fillRect(w.x + offsetX, w.y, w.w, w.h);
    }
}
