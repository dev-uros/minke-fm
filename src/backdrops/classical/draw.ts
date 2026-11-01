import {canvas, RGB} from '../pixel';

type Put = (x: number, y: number, c: RGB, a?: number) => void;

/** Fills a convex polygon pixel by pixel, so its edges stay crisp. */
export function fillPoly(put: Put, pts: Array<[number, number]>, colour: (x: number, y: number) => RGB) {
    const ys = pts.map(p => p[1]);
    const top = Math.floor(Math.min(...ys)), bottom = Math.ceil(Math.max(...ys));
    for (let y = top; y <= bottom; y++) {
        const sy = y + 0.5;
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < pts.length; i++) {
            const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
            if ((sy < y0) === (sy < y1)) continue;
            const x = x0 + (x1 - x0) * (sy - y0) / (y1 - y0);
            lo = Math.min(lo, x);
            hi = Math.max(hi, x);
        }
        for (let x = Math.round(lo); x < Math.round(hi); x++) put(x, y, colour(x, y));
    }
}

/** Builds a small sprite from a character map; '.' is transparent. */
export function sprite(rows: string[], colours: Record<string, string>, flip = false) {
    const w = rows[0].length, h = rows.length;
    const {canvas: c, ctx} = canvas(w, h);
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '.') return;
        ctx.fillStyle = colours[ch];
        ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }));
    return c;
}
