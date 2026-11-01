import {hex, RGB} from '../pixel';

/** Shared bits for the hip hop scene: spray paint colours and abstract graffiti pieces. */

export interface Spray {
    a: RGB;
    b: RGB;
    line: RGB;
    shadow: RGB;
    shine: RGB;
}

export const SPRAYS: Spray[] = [
    {a: hex('#ff4f9a'), b: hex('#ffb347'), line: hex('#1a0f24'), shadow: hex('#3fd0ff'), shine: hex('#fff3e0')},
    {a: hex('#3fe0a0'), b: hex('#1f8fff'), line: hex('#0c1020'), shadow: hex('#ffe14a'), shine: hex('#e8fff6')},
    {a: hex('#ffe14a'), b: hex('#ff7a2f'), line: hex('#24101a'), shadow: hex('#9b4dff'), shine: hex('#ffffff')},
    {a: hex('#b46cff'), b: hex('#ff5fd1'), line: hex('#120a1e'), shadow: hex('#3fe0a0'), shine: hex('#fbeaff')},
    {a: hex('#5ad1ff'), b: hex('#e8f4ff'), line: hex('#0a1424'), shadow: hex('#ff4f6a'), shine: hex('#ffffff')}
];

type Put = (x: number, y: number, c: RGB) => void;

/**
 * One abstract piece: a row of fat, slanted bubble shapes with counters cut
 * out, a dark outline, a drop shadow, a highlight streak and a few drips.
 * Shaped like lettering from across the street, but never spells anything.
 */
export function graffitiPiece(put: Put, x0: number, y0: number, w: number, h: number,
                              random: () => number, s: Spray) {
    const pad = 5, drip = 12;
    const GW = w + pad * 2, GH = h + pad * 2;
    const n = 4 + Math.floor(random() * 3);
    const shear = (random() - 0.5) * 0.5;
    const blobs = Array.from({length: n}, (_, i) => {
        const rx = (w / n) * (0.55 + random() * 0.25);
        const ry = h * (0.34 + random() * 0.16);
        return {
            cx: pad + (i + 0.5) * w / n + (random() - 0.5) * (w / n) * 0.3,
            cy: pad + h / 2 + (random() - 0.5) * h * 0.25,
            rx, ry,
            hole: random() < 0.55 ? {rx: rx * 0.28, ry: ry * 0.3, dx: (random() - 0.5) * rx * 0.4, dy: (random() - 0.5) * ry * 0.5} : null
        };
    });
    const mask = new Uint8Array(GW * GH);
    for (let y = 0; y < GH; y++) {
        for (let x = 0; x < GW; x++) {
            for (const b of blobs) {
                const dx = x - b.cx - (y - b.cy) * shear, dy = y - b.cy;
                if ((dx / b.rx) ** 2 + (dy / b.ry) ** 2 > 1) continue;
                if (b.hole && ((dx - b.hole.dx) / b.hole.rx) ** 2 + ((dy - b.hole.dy) / b.hole.ry) ** 2 <= 1) continue;
                mask[y * GW + x] = 1;
                break;
            }
        }
    }
    const m = (x: number, y: number) => x >= 0 && y >= 0 && x < GW && y < GH && mask[y * GW + x] === 1;
    const near = (f: (x: number, y: number) => boolean, x: number, y: number) =>
        f(x - 1, y) || f(x + 1, y) || f(x, y - 1) || f(x, y + 1) || f(x - 1, y - 1) || f(x + 1, y + 1) || f(x - 1, y + 1) || f(x + 1, y - 1);
    const sh = (x: number, y: number) => !m(x, y) && (m(x - 2, y - 2) || m(x - 3, y - 2) || m(x - 3, y - 3));

    for (let y = 0; y < GH; y++) {
        for (let x = 0; x < GW; x++) {
            const px = x0 - pad + x, py = y0 - pad + y;
            if (m(x, y)) {
                const shine = m(x - 1, y - 1) && !m(x - 2, y - 2) && (x + y) % 3 !== 0;
                const f = (y - pad) / h;
                put(px, py, shine ? s.shine : (f > 0.5 + ((x * 7 + y * 3) % 5) * 0.05 ? s.b : s.a));
            } else if (near(m, x, y)) put(px, py, s.line);
            else if (sh(x, y)) put(px, py, s.shadow);
            else if (near(sh, x, y)) put(px, py, s.line);
        }
    }

    // Drips run down from the bottom edge.
    const drips = 2 + Math.floor(random() * 3);
    for (let k = 0; k < drips; k++) {
        const x = Math.floor(pad + random() * w);
        let yb = -1;
        for (let y = GH - 1; y >= 0; y--) if (m(x, y)) { yb = y; break; }
        if (yb < 0) continue;
        const len = 3 + Math.floor(random() * (drip - 3));
        for (let j = 1; j <= len; j++) put(x0 - pad + x, y0 - pad + yb + j, s.a);
        put(x0 - pad + x + 1, y0 - pad + yb + len, s.a);
    }
}
