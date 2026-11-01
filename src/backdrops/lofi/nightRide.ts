import {Backdrop, canvas, disc, ditherPick, hex, pixels, pulse, rng} from '../pixel';
import {LitWindow, paintWindows, skyline} from '../skyline';

interface Palette {
    sky: string[];
    layers: string[];
    lit: string[];
    moon: string;
    stars: boolean;
    pole: string;
    lampLight: string;
}

/**
 * The view from a train window at night: three rows of city sliding past at
 * different speeds, power poles whipping by, and a carriage that clacks a
 * pixel on the beat.
 */
export function nightRide(id: string, name: string, p: Palette): Backdrop {
    return {
        id, name, bpm: 84,
        create(W, H) {
            const random = rng(23);
            const horizon = Math.round(H * 0.8);
            const sky = p.sky.map(hex);

            const back = pixels(W, H, put => {
                for (let y = 0; y < H; y++)
                    for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, y / horizon, x, y));
                if (p.stars)
                    for (let i = 0; i < 90; i++) put(random() * W, random() * horizon * 0.55, hex('#d6dcff'), 80 + random() * 150);
                const moon = hex(p.moon);
                disc(put, Math.round(W * 0.78), 30, 11, () => moon);
            });

            // Each row is a strip twice the screen wide that scrolls and wraps.
            const rows = p.layers.map((colour, i) => {
                const L = W * 2;
                const strip = canvas(L, H);
                const base = horizon + i * 6;
                const lit = skyline(strip.ctx, {
                    from: 0, to: L, base,
                    minHeight: [40, 24, 12][i], maxHeight: [95, 70, 46][i],
                    minWidth: [10, 12, 14][i], maxWidth: [22, 26, 34][i],
                    colour, lit: p.lit, litChance: [0.08, 0.18, 0.3][i],
                    grid: i === 2 ? [4, 5, 2, 2] : [3, 4, 1, 2]
                }, random);
                strip.ctx.fillStyle = colour;
                strip.ctx.fillRect(0, base, L, H - base);
                return {strip, lit, L, speed: [4, 11, 26][i]};
            });

            // Carriage window: a dark frame with rounded corners.
            const frame = pixels(W, H, put => {
                const inset = {x: 10, y: 10, r: 16};
                const dark = hex('#07060c');
                const edge = hex('#1c1826');
                for (let y = 0; y < H; y++) {
                    for (let x = 0; x < W; x++) {
                        const cx = Math.min(Math.max(x, inset.x + inset.r), W - inset.x - inset.r);
                        const cy = Math.min(Math.max(y, inset.y + inset.r), H - inset.y - inset.r);
                        const d = Math.hypot(x - cx, y - cy);
                        if (d > inset.r + 1) put(x, y, dark);
                        else if (d > inset.r) put(x, y, edge);
                    }
                }
            });

            const poleGap = Math.round(W * 0.9);
            const poleSpeed = 140;

            const paintRow = (ctx: CanvasRenderingContext2D, strip: HTMLCanvasElement, lit: LitWindow[],
                              L: number, offset: number, t: number) => {
                const x = -Math.floor(offset % L);
                ctx.drawImage(strip, x, 0);
                ctx.drawImage(strip, x + L, 0);
                paintWindows(ctx, lit, t, x);
                paintWindows(ctx, lit, t, x + L);
            };

            return (ctx, t, beat) => {
                // The carriage jolts by one pixel on each beat.
                const jolt = pulse(beat) > 0.6 ? 1 : 0;
                ctx.save();
                ctx.translate(0, jolt);

                ctx.drawImage(back.canvas, 0, -1);
                for (const row of rows) paintRow(ctx, row.strip.canvas, row.lit, row.L, t * row.speed, t);

                // Poles and the sagging wire between them.
                const off = (t * poleSpeed) % poleGap;
                for (let k = -1; k < W / poleGap + 2; k++) {
                    const x = Math.round(k * poleGap - off);
                    ctx.fillStyle = p.pole;
                    ctx.fillRect(x, Math.round(H * 0.18), 3, H);
                    ctx.fillRect(x - 6, Math.round(H * 0.18) + 4, 15, 2);
                    ctx.fillStyle = p.lampLight;
                    ctx.fillRect(x - 6, Math.round(H * 0.18) + 2, 2, 2);
                    ctx.fillStyle = p.pole;
                    for (let i = 0; i <= poleGap; i += 1) {
                        const s = i / poleGap;
                        ctx.fillRect(x + i, Math.round(H * 0.18 + 5 + Math.sin(s * Math.PI) * 9), 1, 1);
                    }
                }
                ctx.restore();

                ctx.drawImage(frame.canvas, 0, 0);
                // A faint reflection band across the glass.
                ctx.fillStyle = 'rgba(255,255,255,0.025)';
                ctx.beginPath();
                ctx.moveTo(W * 0.15, 10);
                ctx.lineTo(W * 0.3, 10);
                ctx.lineTo(W * 0.12, H - 10);
                ctx.lineTo(W * -0.03, H - 10);
                ctx.fill();
            };
        }
    };
}

export const NIGHT_RIDE = nightRide('night-ride', 'Night train', {
    sky: ['#05071a', '#0b1030', '#16194a', '#2a2560', '#4a3070'],
    layers: ['#1f1f4a', '#14132e', '#09081a'],
    lit: ['#f2b35a', '#ffd98a', '#8fb8ff', '#ff8fa3'],
    moon: '#f3ead0',
    stars: true,
    pole: '#040309',
    lampLight: '#ffcf7a'
});
