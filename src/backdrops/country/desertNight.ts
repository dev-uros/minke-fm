import {Backdrop, bayer, disc, ditherPick, hash, hex, pixels, pulse, RGB, rng} from '../pixel';

/**
 * Desert night: saguaros in silhouette rimmed by moonlight, mesas on the
 * horizon, the Milky Way arching over a huge starry sky with the odd
 * shooting star, and a coyote on a ridge under the moon that lifts its head
 * to howl now and then. Stars twinkle on the beat.
 */
export const DESERT_NIGHT: Backdrop = {
    id: 'country-desert-night',
    name: 'Desert night',
    bpm: 76,
    create(W, H) {
        const random = rng(57);
        const horizon = Math.round(H * 0.72);
        const sky = ['#04040e', '#080a1e', '#0f1232', '#1b1a45', '#2e2453', '#4d2f5c', '#7a4462'].map(hex);
        const moon = {x: Math.round(W * 0.7), y: 30, r: 9};

        // Milky Way: a diagonal band of dithered haze and dense faint stars.
        const band = (x: number, y: number) => {
            const nx = x / W, ny = y / horizon;
            const d = ny - (0.95 - nx * 1.1 + Math.sin(nx * 5) * 0.06);
            return Math.exp(-d * d * 40);
        };
        const sky0 = pixels(W, H, put => {
            for (let y = 0; y < horizon; y++) {
                for (let x = 0; x < W; x++) {
                    const b = band(x, y);
                    const lift = b * 0.18 * (0.6 + 0.4 * hash(Math.floor(x / 5), Math.floor(y / 4)));
                    put(x, y, ditherPick(sky, Math.pow(y / horizon, 1.6) + lift, x, y));
                    if (b > 0.3 && hash(x, y) < b * 0.05) put(x, y, hex('#a9a6d8'), 120);
                }
            }
            for (let i = 0; i < 180; i++) {
                const x = random() * W, y = Math.pow(random(), 1.3) * horizon * 0.85;
                put(x, y, hex(random() < 0.2 ? '#ffe7c2' : '#d6dcff'), 70 + random() * 140);
            }
            // The moon with a soft halo and a few maria.
            for (let y = -26; y <= 26; y++) {
                for (let x = -26; x <= 26; x++) {
                    const d = Math.hypot(x, y);
                    if (d > moon.r + 1 && d < 26 && (1 - d / 26) * 0.6 > bayer(x, y) + 0.15)
                        put(moon.x + x, moon.y + y, hex('#3a3866'));
                }
            }
            const lunar = hex('#f4ecd2'), shade = hex('#cfc3a2');
            disc(put, moon.x, moon.y, moon.r, (x, y) => {
                const dx = x - moon.x, dy = y - moon.y;
                return (Math.hypot(dx + 3, dy + 2) < 3 || Math.hypot(dx - 3, dy - 3) < 2 || Math.hypot(dx - 2, dy + 4) < 1.5) ? shade : lunar;
            });
        });

        // Land: far mesas, a ridge with the coyote, the desert floor and the saguaros.
        const mesaTop = (x: number) => {
            const f = x / W;
            if (f > 0.04 && f < 0.24) return horizon - 14 + (f < 0.07 || f > 0.21 ? Math.round(Math.abs(f - 0.14) * 70 - 4) : 0);
            if (f > 0.3 && f < 0.42) return horizon - 9 + (f < 0.32 || f > 0.4 ? 3 : 0);
            return horizon - 2 - Math.round(Math.sin(x * 0.05) * 1.5);
        };
        const ridgePeak = Math.round(W * 0.68);
        const ridgeTop = (x: number) => {
            const d = (x - ridgePeak) / (W * 0.22);
            return Math.round(horizon + 4 - 22 * Math.exp(-d * d * 2) - Math.sin(x * 0.3) * 0.8);
        };
        const floor = ['#2a1f3e', '#1e1730', '#141022', '#0c0a16'].map(hex);
        const land = pixels(W, H, put => {
            const mesa = hex('#2c2148'), mesaLit = hex('#4a3766'), ridge = hex('#181226'), rim = hex('#5c4f86');
            for (let x = 0; x < W; x++) {
                const m = mesaTop(x);
                for (let y = m; y <= horizon + 2; y++) put(x, y, y === m ? mesaLit : mesa);
                for (let y = horizon + 2; y < H; y++)
                    put(x, y, ditherPick(floor, (y - horizon) / (H - horizon), x, y));
                const r = ridgeTop(x);
                for (let y = r; y < H && y < horizon + 30; y++) put(x, y, y === r && x > ridgePeak - 30 ? rim : ridge);
            }
            // Scrub and stones on the floor.
            for (let i = 0; i < 70; i++) {
                const y = horizon + 6 + random() * (H - horizon - 6);
                const x = random() * W;
                const s = 1 + Math.floor(((y - horizon) / (H - horizon)) * 3);
                for (let k = 0; k < s * 2; k++) put(x + k - s + (random() < 0.5 ? 0 : 1), y - Math.floor(random() * s), hex('#090712'));
                put(x + s, y - s, hex('#3a3060'));
            }
        });

        // Saguaros, built as a mask so the moonward edges can be rimmed with light.
        const cactus = new Uint8Array(W * H);
        const fill = (x0: number, y0: number, w: number, h: number) => {
            for (let y = y0; y < y0 + h; y++)
                for (let x = x0; x < x0 + w; x++)
                    if (x >= 0 && y >= 0 && x < W && y < H) cactus[y * W + x] = 1;
        };
        const column = (x: number, top: number, bottom: number, w: number) => {
            fill(x + 1, top, w - 2, 1);
            fill(x, top + 1, w, bottom - top);
        };
        const saguaro = (cx: number, base: number, h: number, w: number, arms: Array<[number, number, number]>) => {
            column(cx - Math.floor(w / 2), base - h, base, w);
            for (const [side, at, len] of arms) {
                const aw = Math.max(3, w - 2);
                const ay = base - Math.round(h * at);
                const out = Math.round(w * 0.9);
                const ax = side < 0 ? cx - Math.floor(w / 2) - out - aw + 2 : cx + Math.ceil(w / 2) + out - 2;
                fill(Math.min(ax, cx), ay - aw + 1, Math.abs(ax - cx) + aw, aw);
                column(ax, ay - Math.round(h * len), ay, aw);
            }
        };
        saguaro(Math.round(W * 0.2), H + 2, 92, 9, [[-1, 0.45, 0.32], [1, 0.62, 0.26]]);
        saguaro(Math.round(W * 0.42), horizon + 22, 30, 5, [[1, 0.5, 0.3]]);
        saguaro(Math.round(W * 0.88), H + 2, 62, 7, [[-1, 0.5, 0.28]]);
        saguaro(Math.round(W * 0.53), horizon + 12, 16, 3, []);
        const front = pixels(W, H, put => {
            const body = hex('#07060e'), lit = hex('#4a4478'), dim = hex('#221f3c');
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    if (!cactus[y * W + x]) continue;
                    const rightOpen = x + 1 >= W || !cactus[y * W + x + 1];
                    const topOpen = y === 0 || !cactus[(y - 1) * W + x];
                    put(x, y, rightOpen ? lit : topOpen ? dim : (x % 3 === 0 && y % 2 === 0 ? hex('#100d1c') : body));
                }
            }
        });

        // The coyote: sitting, head level, then raised to howl.
        const sit = [
            '............',
            '............',
            '........#.#.',
            '........####',
            '.......######',
            '.......####..',
            '......####...',
            '.....#####...',
            '....######...',
            '...#######...',
            '..########...',
            '..########...',
            '..##.###.#...',
            '#####.##.##..'
        ];
        const howl = [
            '...........#',
            '..........##',
            '.........##.',
            '.......#.##.',
            '.......####.',
            '......####..',
            '......###...',
            '.....####...',
            '....#####...',
            '...######...',
            '..#######...',
            '..########..',
            '..##.###.#..',
            '#####.##.##.'
        ];
        const coyote = {x: ridgePeak - 6, y: ridgeTop(ridgePeak) - 13};
        const drawSprite = (ctx: CanvasRenderingContext2D, rows: string[]) => {
            ctx.fillStyle = '#100c1a';
            rows.forEach((row, y) => {
                for (let x = 0; x < row.length; x++) if (row[x] === '#') ctx.fillRect(coyote.x + x, coyote.y + y, 1, 1);
            });
        };

        const twinkle = Array.from({length: 36}, () => ({
            x: Math.round(random() * W), y: Math.round(Math.pow(random(), 1.4) * horizon * 0.8),
            seed: random() * 100, big: random() < 0.3
        }));
        const starColour: RGB = hex('#eef0ff');

        return (ctx, t, beat) => {
            ctx.drawImage(sky0.canvas, 0, 0);
            const kick = pulse(beat);

            for (const s of twinkle) {
                const v = 0.5 + 0.5 * Math.sin(t * (1 + (s.seed % 2)) + s.seed) + kick * 0.4 * (s.seed % 3 < 1 ? 1 : 0);
                if (v < 0.25) continue;
                ctx.fillStyle = `rgba(${starColour.join(',')},${Math.min(1, v).toFixed(2)})`;
                ctx.fillRect(s.x, s.y, 1, 1);
                if (s.big && v > 0.85) {
                    ctx.fillStyle = `rgba(${starColour.join(',')},${((v - 0.85) * 3).toFixed(2)})`;
                    ctx.fillRect(s.x - 1, s.y, 3, 1);
                    ctx.fillRect(s.x, s.y - 1, 1, 3);
                }
            }

            // A shooting star most slots; each lasts under a second.
            const period = 5.5, slot = Math.floor(t / period);
            if (hash(slot, 3) < 0.75) {
                const p = (t - slot * period) / 0.9;
                if (p < 1) {
                    const sx = hash(slot, 7) * W * 0.8 + W * 0.1, sy = 8 + hash(slot, 9) * horizon * 0.35;
                    const dir = hash(slot, 11) < 0.5 ? -1 : 1;
                    const len = 34;
                    const hx = sx + dir * p * len * 1.6, hy = sy + p * len * 0.6;
                    for (let k = 0; k < 14; k++) {
                        const a = (1 - k / 14) * (1 - p * 0.6);
                        ctx.fillStyle = `rgba(255,244,220,${a.toFixed(2)})`;
                        ctx.fillRect(Math.round(hx - dir * k * 1.6), Math.round(hy - k * 0.6), 1, 1);
                    }
                }
            }

            ctx.drawImage(land.canvas, 0, 0);
            // Howls for a few seconds out of every twenty.
            const cycle = t % 20;
            drawSprite(ctx, cycle > 12 && cycle < 17.5 ? howl : sit);
            ctx.drawImage(front.canvas, 0, 0);
        };
    }
};
