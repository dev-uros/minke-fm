import {Backdrop, css, ditherPick, hash, hex, pixels, pulse, RGB, rng} from '../pixel';
import {mix, shade} from './draw';

/**
 * Looking down a narrow street of painted houses at dusk on fiesta night.
 * Rows of cut-paper flags strung from wall to wall flutter in the breeze,
 * strings of bulbs between them twinkle with the beat, and a little church
 * closes the far end.
 */
export const FIESTA_ALLEY: Backdrop = {
    id: 'latin-fiesta-alley',
    name: 'Fiesta street',
    bpm: 108,
    create(W, H) {
        const random = rng(17);
        const vx = Math.round(W / 2), vy = 84;
        const side = W / 2 + 24;          // wall distance, in screen px at depth 1
        const eye = 104;                  // ground below the eye, in screen px at depth 1
        const zEnd = 13;

        const sky: RGB[] = ['#0d0b2e', '#1d1850', '#3b2466', '#7a3a6e', '#d8706a', '#f4b07a'].map(hex);
        const fog = hex('#5a3a6a');
        const paints = ['#e2557a', '#f2a93b', '#3fb5a8', '#5a7bd8', '#f0d46a', '#9a62d8', '#e9714a', '#7cc96a'].map(hex);
        const shutters = ['#1f6a5a', '#2a4a8a', '#8a2a3a', '#5a3a1a'].map(hex);
        const lit = hex('#ffc26a');

        // Houses along each wall, as runs of depth.
        type House = {z0: number; z1: number; roof: number; paint: RGB; shutter: RGB; seed: number};
        const street = (seed: number) => {
            const r = rng(seed);
            const list: House[] = [];
            let z = 0.6;
            let last = -1;
            while (z < zEnd) {
                const len = 1.1 + r() * 1.3;
                let p = Math.floor(r() * paints.length);
                if (p === last) p = (p + 3) % paints.length;
                last = p;
                list.push({z0: z, z1: z + len, roof: 92 + r() * 70, paint: paints[p],
                    shutter: shutters[Math.floor(r() * shutters.length)], seed: r() * 100});
                z += len;
            }
            return list;
        };
        const left = street(4), right = street(9);

        // Colour of a point on a wall: f runs along the house, Y is height (0 = eye, + down).
        const wallColour = (h: House, f: number, Y: number, x: number, y: number, z: number, lightSide: boolean): RGB => {
            let c: RGB;
            const upper = h.roof > 100;
            const inRect = (f0: number, f1: number, y0: number, y1: number) => f >= f0 && f <= f1 && Y >= y0 && Y <= y1;
            const winLit = (k: number) => hash(h.seed, k) < 0.55;
            if (inRect(0.14, 0.38, 22, eye)) {
                c = inRect(0.17, 0.35, 28, eye) ? (winLit(1) ? hex('#c8803e') : hex('#3a1c12')) : hex('#efe3c8');
            } else if (inRect(0.56, 0.86, 30, 72)) {
                c = inRect(0.6, 0.82, 34, 70) ? (winLit(2) ? lit : h.shutter) : hex('#efe3c8');
                if (Math.floor(f * 40) % 3 === 0 && inRect(0.6, 0.82, 34, 70)) c = hex('#1a1214');
            } else if (upper && (inRect(0.14, 0.38, -70, -18) || inRect(0.56, 0.86, -70, -18))) {
                const k = f < 0.5 ? 3 : 4;
                const inner = inRect(0.17, 0.35, -66, -20) || inRect(0.6, 0.82, -66, -20);
                c = inner ? (winLit(k) ? lit : h.shutter) : hex('#efe3c8');
                // Little iron balconies.
                if (Y > -30 && Y < -18 && (Math.floor(f * 50) % 2 === 0 || Y < -28)) c = hex('#1a1214');
            } else if (Y > 10 && Y < 16) {
                c = shade(h.paint, 0.75);
            } else if (Y < -h.roof + 8) {
                c = hex('#f4ead8');
            } else {
                c = h.paint;
            }
            if (c !== lit) {
                const grad = 0.36 + 0.34 * ((Y + h.roof) / (eye + h.roof)) + (lightSide ? 0.06 : -0.04);
                c = shade(c, grad + (((x ^ y) & 1) ? 0.03 : 0));
            }
            // Edge where two houses meet.
            if (f < 0.03) c = shade(c, 0.7);
            return mix(c, fog, Math.min(0.75, (z - 1) / 16));
        };

        const scene = pixels(W, H, put => {
            for (let x = 0; x < W; x++) {
                const dx = x - vx;
                const zw = dx === 0 ? Infinity : side / Math.abs(dx);
                const houses = dx < 0 ? left : right;
                for (let y = 0; y < H; y++) {
                    const skyC = ditherPick(sky, y / vy, x, y);
                    if (zw < zEnd) {
                        const h = houses.find(o => zw >= o.z0 && zw < o.z1)!;
                        const roofY = vy - h.roof / zw;
                        const groundY = vy + eye / zw;
                        if (y < roofY) {
                            put(x, y, skyC);
                            continue;
                        }
                        if (y <= groundY) {
                            const Y = (y - vy) * zw;
                            put(x, y, wallColour(h, (zw - h.z0) / (h.z1 - h.z0), Y, x, y, zw, dx < 0));
                            continue;
                        }
                    } else {
                        // The church closing the street.
                        const Xk = dx * zEnd;
                        const Y = (y - vy) * zEnd;
                        const tower = Math.abs(Xk - 70) < 40;
                        const top = tower ? -290 : -170 + Math.abs(Xk) * 0.25;
                        if (y >= vy + eye / zEnd) {
                            // street below
                        } else if (Y >= top) {
                            let c: RGB = hex('#f2e2c0');
                            if (Math.abs(Xk) < 30 && Y > 30) c = hex('#3a1c12');
                            if (Math.abs(Xk) < 30 && Y > 30 && Y < 40) c = hex('#c08a50');
                            if (tower && Y > -260 && Y < -200 && Math.abs(Xk - 70) < 18) c = hex('#2a1a2a');
                            if (Math.abs(Xk) < 20 && Y > -120 && Y < -80) c = hex('#ffcc7a');
                            put(x, y, mix(c, fog, 0.55));
                            continue;
                        } else {
                            put(x, y, skyC);
                            continue;
                        }
                    }
                    // Cobbles.
                    const zg = eye / Math.max(0.5, y - vy);
                    const u = (dx * zg) / 6;
                    const row = Math.floor(zg * 7);
                    const gap = (((u + row * 0.5) % 1) + 1) % 1 < 0.14 || (zg * 7) % 1 < 0.16;
                    const glow = Math.max(0, 1 - Math.abs(dx) / (W * 0.5)) * 0.3;
                    const base = mix(hex('#2a1e2c'), hex('#7a4a3e'), glow + hash(Math.floor(u + row * 0.5), row) * 0.25);
                    put(x, y, mix(gap ? shade(base, 0.55) : base, fog, Math.min(0.7, (zg - 1) / 16)));
                }
            }
            for (let i = 0; i < 40; i++) put(random() * W, random() * vy * 0.5, hex('#ffffff'), 60 + random() * 120);
        });

        // Strings across the street, near to far.
        const flagColours = ['#ff3d7f', '#ffb21f', '#2ed1c4', '#a45bff', '#5ee05a', '#ff6a2a', '#3a8bff'].map(hex);
        const strings = [1.25, 1.9, 2.8, 4.1, 6, 8.8].map((z, i) => ({
            z, lights: i % 2 === 1, rise: i % 2 === 1 ? 26 + random() * 10 : 58 + random() * 14, seed: random() * 100
        }));
        const stringY = (s: typeof strings[number], x: number) => {
            const u = (x - (vx - side / s.z)) / (2 * side / s.z);
            return vy - s.rise / s.z + (16 / s.z) * (1 - Math.pow(2 * u - 1, 2));
        };

        const glow = scene.ctx.createRadialGradient(vx, H * 0.55, 4, vx, H * 0.55, W * 0.55);
        glow.addColorStop(0, 'rgba(255,170,90,1)');
        glow.addColorStop(1, 'rgba(255,170,90,0)');

        return (ctx, t, beat) => {
            const b = pulse(beat);
            ctx.drawImage(scene.canvas, 0, 0);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.1 + 0.06 * b;
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';

            // Far strings first, so near flags overlap them.
            for (let si = strings.length - 1; si >= 0; si--) {
                const s = strings[si];
                const x0 = Math.max(0, Math.floor(vx - side / s.z)), x1 = Math.min(W, Math.ceil(vx + side / s.z));
                const dim = Math.min(0.7, (s.z - 1) / 12);
                ctx.fillStyle = css(mix(hex('#2a1a2a'), fog, dim));
                for (let x = x0; x < x1; x++) ctx.fillRect(x, Math.round(stringY(s, x)), 1, 1);

                if (s.lights) {
                    const step = Math.max(3, Math.round(9 / s.z * 1.6));
                    for (let x = x0 + 2, i = 0; x < x1; x += step, i++) {
                        const y = Math.round(stringY(s, x)) + 1;
                        const on = 0.6 + 0.4 * Math.max(b * ((i + Math.floor(beat)) % 3 === 0 ? 1 : 0.3), 0.3 * Math.sin(t * 2 + i));
                        ctx.fillStyle = css(hex(i % 2 ? '#ffe08a' : '#ffb35a'), on);
                        ctx.fillRect(x, y, s.z < 3 ? 2 : 1, s.z < 3 ? 2 : 1);
                        if (s.z < 5) {
                            ctx.fillStyle = css(hex('#ffcf7a'), 0.2 * on);
                            ctx.fillRect(x - 1, y - 1, 4, 4);
                            ctx.fillRect(x, y - 2, 2, 6);
                            ctx.fillRect(x - 2, y, 6, 2);
                        }
                    }
                    continue;
                }

                // Paper flags, each a little banner with cut-outs that ripples.
                const fw = Math.max(1, Math.round(13 / s.z)), fh = Math.max(1, Math.round(17 / s.z));
                const gapPx = Math.max(1, Math.round(3 / s.z));
                let i = 0;
                for (let x = x0 + gapPx; x + fw < x1; x += fw + gapPx, i++) {
                    const c = mix(flagColours[(i + Math.floor(s.seed)) % flagColours.length], fog, dim);
                    const top = Math.round(stringY(s, x + fw / 2)) + 1;
                    const wind = Math.sin(t * 2.2 + i * 0.7 + s.seed) * 0.5 + Math.sin(t * 5.3 + i * 1.3) * 0.25;
                    for (let j = 0; j < fw; j++) {
                        const ripple = Math.round(Math.sin(t * 6 + i * 1.7 + j * 0.9) * wind * (fh > 6 ? 1.6 : 0.6));
                        const len = fh + ripple;
                        const shadeF = 0.8 + 0.2 * Math.sin(t * 6 + i * 1.7 + j * 0.9 + 1.2) * wind;
                        ctx.fillStyle = css(shade(c, shadeF));
                        ctx.fillRect(x + j, top, 1, len);
                        // Cut-out holes and a zigzag hem on the bigger flags.
                        if (fh >= 8) {
                            // Holes show the street behind: copy it back from the static layer.
                            const mid = j === Math.floor(fw / 2);
                            if (mid || j % 3 === 1) {
                                const hy = top + Math.round(len * 0.45) - (mid ? 1 : 0), hh = mid ? 3 : 1;
                                ctx.drawImage(scene.canvas, x + j, hy, 1, hh, x + j, hy, 1, hh);
                            }
                            if (j % 2 === 0) ctx.drawImage(scene.canvas, x + j, top + len - 1, 1, 1, x + j, top + len - 1, 1, 1);
                        }
                    }
                }
            }
        };
    }
};
