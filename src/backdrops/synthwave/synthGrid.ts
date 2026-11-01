import {Backdrop, css, disc, ditherPick, hex, pixels, pulse, rng} from '../pixel';

interface Palette {
    sky: string[];
    sun: string[];
    mountains: [string, string];
    ridge: string;
    ground: string;
    grid: string;
}

/**
 * Outrun: a striped sun sinking behind mountains, and a neon grid rolling
 * towards the viewer that flares on every beat.
 */
export function synthGrid(id: string, name: string, p: Palette): Backdrop {
    return {
        id, name, bpm: 110,
        create(W, H) {
            const random = rng(5);
            const horizon = Math.round(H * 0.58);
            const sky = p.sky.map(hex);
            const sunColours = p.sun.map(hex);
            const R = Math.round(H * 0.2);

            const back = pixels(W, H, put => {
                for (let y = 0; y < horizon; y++)
                    for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, y / horizon, x, y));
                for (let i = 0; i < 80; i++) put(random() * W, random() * horizon * 0.5, hex('#ffffff'), 60 + random() * 160);
            });

            const sun = pixels(2 * R + 1, 2 * R + 1, put =>
                disc(put, R, R, R, (x, y) => ditherPick(sunColours, y / (2 * R), x, y)));

            // Mountains and ground sit in front of the sun.
            const ridge = (seed: number, height: number, rough: number) => {
                const r = rng(seed);
                const peaks = Array.from({length: 9}, () => r());
                return (x: number) => {
                    const f = (x / W) * (peaks.length - 1);
                    const i = Math.floor(f);
                    const v = peaks[i] + (peaks[Math.min(i + 1, peaks.length - 1)] - peaks[i]) * (f - i);
                    const jag = Math.sin(x * 0.9) * 0.4 + Math.sin(x * 0.37) * 0.6;
                    // Keep the middle low so the sun shows through.
                    const valley = 1 - 0.75 * Math.exp(-Math.pow((x - W / 2) / (W * 0.16), 2));
                    return Math.round(horizon - (v * height + jag * rough) * valley);
                };
            };
            const far = ridge(3, H * 0.2, 2);
            const near = ridge(8, H * 0.12, 1.5);
            const front = pixels(W, H, put => {
                const [farC, nearC] = p.mountains.map(hex);
                const edge = hex(p.ridge);
                const ground = hex(p.ground);
                for (let x = 0; x < W; x++) {
                    const top = far(x);
                    for (let y = top; y < horizon; y++) put(x, y, y === top ? edge : farC);
                    const n = near(x);
                    for (let y = n; y < horizon; y++) put(x, y, y === n ? edge : nearC);
                    for (let y = horizon; y < H; y++) put(x, y, ground);
                }
            });

            const grid = hex(p.grid);
            const vx = W / 2;
            const depth = H - horizon;

            return (ctx, t, beat) => {
                const glow = pulse(beat);
                ctx.drawImage(back.canvas, 0, 0);

                // Sun, with gaps in its lower half drifting downwards.
                const sx = Math.round(W / 2 - R), sy = Math.round(horizon - R * 1.35);
                for (let y = 0; y <= 2 * R; y++) {
                    const rel = y / (2 * R);
                    if (rel > 0.45) {
                        const gap = (rel - 0.45) * 6;
                        if ((((y - t * 4) % 7) + 7) % 7 < gap) continue;
                    }
                    ctx.drawImage(sun.canvas, 0, y, 2 * R + 1, 1, sx, sy + y, 2 * R + 1, 1);
                }

                ctx.drawImage(front.canvas, 0, 0);

                // Horizontal lines rushing towards us.
                const scroll = (t * 1.2) % 1;
                for (let i = 0; i < 24; i++) {
                    const z = i + 1 - scroll;
                    if (z <= 0.2) continue;
                    const y = Math.round(horizon + depth / z);
                    if (y >= H) continue;
                    ctx.fillStyle = css(grid, Math.min(1, 1.4 / z) * (0.55 + 0.45 * glow));
                    ctx.fillRect(0, y, W, 1);
                }

                // Lines converging on the vanishing point.
                ctx.strokeStyle = css(grid, 0.5 + 0.4 * glow);
                ctx.lineWidth = 1;
                ctx.beginPath();
                const spacing = W / 9;
                for (let i = -14; i <= 14; i++) {
                    ctx.moveTo(vx + i * spacing * 0.08, horizon);
                    ctx.lineTo(vx + i * spacing * 1.6, H + 2);
                }
                ctx.stroke();

                ctx.fillStyle = css(grid, 0.9);
                ctx.fillRect(0, horizon, W, 1);
                ctx.fillStyle = css(grid, 0.12 + 0.12 * glow);
                ctx.fillRect(0, horizon - 2, W, 2);
            };
        }
    };
}

export const SYNTH_MAGENTA = synthGrid('synth-magenta', 'Outrun', {
    sky: ['#0b0220', '#1d0d40', '#3d1460', '#7a1f6e', '#c93a6e', '#ff7a5c'],
    sun: ['#fff27a', '#ffc94a', '#ff8a4a', '#ff4f7a', '#e0307f'],
    mountains: ['#2a0e4a', '#14062a'],
    ridge: '#ff4fc8',
    ground: '#0a0318',
    grid: '#ff3fd0'
});
