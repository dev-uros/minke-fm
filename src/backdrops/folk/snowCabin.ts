import {Backdrop, bayer, canvas, disc, ditherPick, hash, hex, pixels, pulse, RGB, rng, wrappingNoise} from '../pixel';

/**
 * A log cabin in snowy pine woods at night: warm light in the windows spills
 * onto the snow, smoke curls from the stone chimney, and snow keeps falling
 * in two depths. The window glow breathes gently on the beat.
 */
export const SNOW_CABIN: Backdrop = {
    id: 'folk-snow-cabin',
    name: 'Snowy cabin',
    bpm: 70,
    create(W, H) {
        const random = rng(19);
        const horizon = Math.round(H * 0.5);
        const base = Math.round(H * 0.74);
        const sky = ['#05081a', '#0a1230', '#132046', '#1f3058', '#2c3e66'].map(hex);
        const snow = ['#eef4fd', '#cfdcf0', '#a8bad8', '#7f92ba', '#5c6c98'].map(hex);
        const cx = Math.round(W / 2);
        const noise = wrappingNoise(W, H, 16, random);

        const hillA = (x: number) => horizon + 4 - Math.round(6 * Math.sin(x * 0.02 + 0.8) + 3 * Math.sin(x * 0.05));
        const hillB = (x: number) => base - 6 - Math.round(4 * Math.sin(x * 0.017 + 2) + 2 * Math.sin(x * 0.061));

        // A pine with stacked tiers, snow on the top of each tier.
        const pine = (put: (x: number, y: number, c: RGB) => void, px: number, bottom: number, h: number,
                      body: RGB, lit: RGB, snowC: RGB) => {
            const top = bottom - h, tiers = Math.max(3, Math.round(h / 9)), tierH = h / tiers;
            for (let y = top; y < bottom - Math.max(1, h * 0.08); y++) {
                const v = (y - top) / h;
                const within = ((y - top) % tierH) / tierH;
                const w = Math.max(0.5, v * h * 0.34 * (0.55 + 0.45 * within));
                for (let x = Math.round(px - w); x <= Math.round(px + w); x++) {
                    const onTop = within < 0.3 && hash(x, y) < 0.8;
                    put(x, y, onTop ? snowC : x > px + w * 0.4 ? lit : body);
                }
            }
            for (let y = bottom - Math.max(1, Math.round(h * 0.08)); y <= bottom; y++) put(px, y, hex('#2a1c18'));
        };

        const back = pixels(W, H, put => {
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, y / horizon, x, y));
            for (let i = 0; i < 110; i++) put(random() * W, random() * horizon * 0.8, hex('#dfe6ff'), 60 + random() * 160);
            const moon = {x: Math.round(W * 0.8), y: 26};
            disc(put, moon.x, moon.y, 7, () => hex('#f0f2e4'));
            disc(put, moon.x - 3, moon.y - 2, 6, (x, y) => ditherPick(sky, y / horizon, x, y));
            // Distant snowy hill with a band of blue pines.
            for (let x = 0; x < W; x++) {
                const a = hillA(x);
                for (let y = a; y < H; y++) put(x, y, ditherPick(snow, 0.45 + (y - a) / 60 + noise(x, y) * 0.2, x, y));
            }
            for (let x = 2; x < W; x += 3 + Math.floor(random() * 3)) {
                const h = 8 + random() * 10;
                pine(put, x, hillA(x) + 2, h, hex('#1a2842'), hex('#22345a'), hex('#8fa2c8'));
            }
            // Middle slope and the main snowfield.
            for (let x = 0; x < W; x++) {
                const b = hillB(x);
                for (let y = b; y < H; y++) {
                    const v = 0.18 + (y - b) / 120 + (noise(x * 1.5, y * 2) - 0.5) * 0.35;
                    put(x, y, ditherPick(snow, v, x, y));
                }
            }
            // Mid pines, leaving room for the cabin.
            for (let i = 0; i < 14; i++) {
                const x = Math.round(random() * W);
                if (Math.abs(x - cx) < 40) continue;
                pine(put, x, hillB(x) + 3, 20 + random() * 18, hex('#0f1c26'), hex('#1a2e3a'), hex('#c4d2ea'));
            }
        });

        // The cabin, front on, with its own light.
        const cw = 48, ch = 18, cabinX = cx - cw / 2, wallTop = base - ch;
        const chimney = {x: cabinX + cw - 12, y: wallTop - 20};
        const windows = [{x: cabinX + 6, y: wallTop + 5}, {x: cabinX + cw - 14, y: wallTop + 5}];
        const front = pixels(W, H, put => {
            // Warm light spilling onto the snow below the windows and door.
            for (let y = base; y < base + 26; y++) {
                for (let x = cabinX - 10; x < cabinX + cw + 10; x++) {
                    let f = 0;
                    for (const w of windows) f = Math.max(f, 1 - Math.hypot((x - w.x - 3) / 10, (y - base) / 16));
                    f = Math.max(f, 1 - Math.hypot((x - cx) / 6, (y - base) / 22));
                    if (f > bayer(x, y) * 1.4 + 0.05) put(x, y, f > 0.55 ? hex('#ffd8a0') : hex('#d8b49a'));
                }
            }
            // Footpath trampled towards the viewer.
            for (let y = base + 1; y < H; y++) {
                const px = cx + Math.round(Math.sin((y - base) * 0.09) * 10 * ((y - base) / (H - base)));
                const hw = 2 + (y - base) / 10;
                for (let x = Math.round(px - hw); x <= Math.round(px + hw); x++)
                    if (hash(x, y) < 0.55) put(x, y, hash(x, y) < 0.2 ? hex('#8a9cc4') : hex('#a8bad8'));
            }
            // Chimney stones.
            for (let y = chimney.y; y < wallTop; y++)
                for (let x = chimney.x; x < chimney.x + 6; x++)
                    put(x, y, (x + (Math.floor(y / 2) % 2) * 2) % 3 === 0 || y % 2 === 0 ? hex('#4a4652') : hex('#6c6672'));
            for (let x = chimney.x - 1; x < chimney.x + 7; x++) put(x, chimney.y - 1, hex('#e8eef8'));
            // Log walls with notched corners.
            for (let y = wallTop; y < base; y++)
                for (let x = cabinX; x < cabinX + cw; x++) {
                    const row = Math.floor((y - wallTop) / 3);
                    const edge = (y - wallTop) % 3 === 2;
                    put(x, y, edge ? hex('#2e1c12') : (row % 2 ? hex('#5c3a24') : hex('#6a4429')));
                }
            for (let r = 0; r < ch / 3; r++) {
                const y = wallTop + r * 3;
                for (const ex of [cabinX - 2, cabinX + cw]) {
                    put(ex, y, hex('#8a6440'));
                    put(ex + 1, y, hex('#a07a50'));
                    put(ex, y + 1, hex('#7a5434'));
                    put(ex + 1, y + 1, hex('#8a6440'));
                }
            }
            // Roof with heavy snow, overhanging the walls.
            const peak = wallTop - 18;
            for (let y = peak; y <= wallTop; y++) {
                const hw = ((y - peak) / (wallTop - peak)) * (cw / 2 + 6);
                for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
                    const fromEdge = Math.min(y - peak, hw - Math.abs(x - cx));
                    const snowy = fromEdge < 3 + hash(x, 1) * 2 || y > wallTop - 3;
                    put(x, y, snowy ? ditherPick(snow, 0.1 + (y - peak) / 80, x, y) : hex('#3a2a2a'));
                }
            }
            for (let x = Math.round(cx - cw / 2 - 6); x <= Math.round(cx + cw / 2 + 6); x++)
                if (hash(x, 4) < 0.2) put(x, wallTop + 1, hex('#dfe8f6'));
            // Door and windows.
            for (let y = base - 13; y < base; y++)
                for (let x = cx - 4; x < cx + 4; x++)
                    put(x, y, x === cx - 4 || x === cx + 3 || y === base - 13 ? hex('#2a180e') : hex('#4a2c1a'));
            put(cx + 2, base - 7, hex('#e0b060'));
            // Snow drifted against the walls.
            for (let x = cabinX - 4; x < cabinX + cw + 4; x++) {
                const h = 2 + Math.round(Math.sin(x * 0.4) + hash(x, 2) * 2);
                for (let y = base - h; y < base + 1; y++) if (Math.abs(x - cx) > 4) put(x, y, ditherPick(snow, 0.15, x, y));
            }
            // Foreground pines framing the sides.
            pine(put, Math.round(W * 0.09), H + 6, 92, hex('#08121a'), hex('#12222c'), hex('#dfe8f6'));
            pine(put, Math.round(W * 0.93), H + 4, 78, hex('#08121a'), hex('#12222c'), hex('#dfe8f6'));
        });

        const glowG = canvas(1, 1).ctx.createRadialGradient(cx, base - 8, 2, cx, base - 8, 60);
        glowG.addColorStop(0, 'rgba(255,170,80,1)');
        glowG.addColorStop(1, 'rgba(255,170,80,0)');

        const flakes = Array.from({length: 190}, () => {
            const near = random() < 0.3;
            return {
                x: random() * W, y: random() * H, near,
                speed: near ? 16 + random() * 10 : 6 + random() * 6,
                ph: random() * 6
            };
        });
        const smoke = Array.from({length: 16}, (_, i) => ({age: i * 0.45, life: 7.2}));
        let last = 0;

        return (ctx, t, beat) => {
            const dt = Math.min(0.1, t - last);
            last = t;
            const kick = pulse(beat);
            ctx.drawImage(back.canvas, 0, 0);

            // Far flakes behind the cabin.
            ctx.fillStyle = 'rgba(210,222,245,0.55)';
            for (const f of flakes) {
                if (f.near) continue;
                f.y += f.speed * dt;
                if (f.y > H) { f.y = -2; f.x = random() * W; }
                ctx.fillRect(Math.round(f.x + Math.sin(t * 0.8 + f.ph) * 3), Math.round(f.y), 1, 1);
            }

            // Chimney smoke drifts up and to the right, swelling and thinning.
            for (const s of smoke) {
                s.age += dt;
                if (s.age > s.life) s.age -= s.life;
                const f = s.age / s.life;
                const r = 1 + Math.round(f * 4);
                const x = Math.round(chimney.x + 3 + s.age * 4 + Math.sin(s.age * 1.3) * 2 * f);
                const y = Math.round(chimney.y - 2 - s.age * 7);
                ctx.fillStyle = `rgba(150,160,184,${(0.32 * (1 - f)).toFixed(3)})`;
                ctx.fillRect(x - r, y - r + 1, r * 2, r * 2 - 1);
                ctx.fillRect(x - r + 1, y - r, r * 2 - 2, r * 2 + 1);
            }

            ctx.drawImage(front.canvas, 0, 0);

            // Windows: warm panes with a slowly moving inner light.
            for (let i = 0; i < windows.length; i++) {
                const w = windows[i];
                ctx.fillStyle = '#2a180e';
                ctx.fillRect(w.x - 1, w.y - 1, 9, 8);
                const flick = Math.sin(t * 1.7 + i * 2) * 0.5 + 0.5;
                ctx.fillStyle = flick > 0.7 ? '#ffe2a2' : '#ffcf7a';
                ctx.fillRect(w.x, w.y, 7, 6);
                ctx.fillStyle = '#f2a850';
                ctx.fillRect(w.x, w.y + 4, 7, 2);
                ctx.fillStyle = '#3a2418';
                ctx.fillRect(w.x + 3, w.y, 1, 6);
                ctx.fillRect(w.x, w.y + 2, 7, 1);
                ctx.fillStyle = '#eef4fd';
                ctx.fillRect(w.x - 1, w.y + 6, 9, 1);
            }

            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.12 + 0.06 * kick;
            ctx.fillStyle = glowG;
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';

            // Near flakes in front of everything.
            for (const f of flakes) {
                if (!f.near) continue;
                f.y += f.speed * dt;
                if (f.y > H) { f.y = -2; f.x = random() * W; }
                const x = Math.round(f.x + Math.sin(t * 1.1 + f.ph) * 5);
                ctx.fillStyle = 'rgba(240,246,255,0.9)';
                ctx.fillRect(x, Math.round(f.y), 1, 1);
                ctx.fillStyle = 'rgba(240,246,255,0.35)';
                ctx.fillRect(x + 1, Math.round(f.y), 1, 1);
                ctx.fillRect(x, Math.round(f.y) + 1, 1, 1);
            }
        };
    }
};
