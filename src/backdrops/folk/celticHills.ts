import {Backdrop, bayer, canvas, disc, ditherPick, hash, hex, pixels, pulse, RGB, rng, wrappingNoise} from '../pixel';

/**
 * Green rolling hills under a big changeable sky: a dry-stone wall snakes
 * over the slopes, a ring of standing stones crowns the far hill, sheep
 * graze, and cloud shadows slide across the fields while the wind runs
 * through the near grass. A shaft of sun brightens softly on the beat.
 */
export const CELTIC_HILLS: Backdrop = {
    id: 'folk-celtic-hills',
    name: 'Stone wall hills',
    bpm: 90,
    create(W, H) {
        const random = rng(64);
        const horizon = Math.round(H * 0.46);
        const sky = ['#5a7c9e', '#7896b2', '#9cb2c4', '#bfcdd2', '#dcdfd2'].map(hex);
        const far = (x: number) => horizon + 2 - Math.round(9 * Math.exp(-Math.pow((x - W * 0.5) / (W * 0.22), 2)) + 3 * Math.sin(x * 0.03));
        const mid = (x: number) => horizon + 22 - Math.round(8 * Math.sin(x * 0.019 + 2.2) + 2 * Math.sin(x * 0.07));
        const near = (x: number) => Math.round(H * 0.74) - Math.round(9 * Math.sin(x * 0.013 + 0.6) + 2 * Math.sin(x * 0.05));
        const farC = ['#7c9c84', '#6a8c72', '#5a7c64'].map(hex);
        const midC = ['#8ab45a', '#6c9e48', '#548a3c', '#43763a'].map(hex);
        const nearC = ['#6aa444', '#4e8a38', '#3c7232', '#2e5c2a', '#244a24'].map(hex);
        const n = wrappingNoise(W, H, 20, random);

        const land = pixels(W, H, put => {
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, y / horizon, x, y));
            for (let x = 0; x < W; x++) {
                const f = far(x), m = mid(x), nr = near(x);
                for (let y = f; y < m; y++) put(x, y, ditherPick(farC, (y - f) / 22 + n(x, y) * 0.2, x, y));
                for (let y = m; y < nr; y++) put(x, y, ditherPick(midC, (y - m) / 40 + (n(x * 2, y * 2) - 0.5) * 0.4, x, y));
                for (let y = nr; y < H; y++) put(x, y, ditherPick(nearC, (y - nr) / (H - nr) * 0.8 + (n(x, y * 3) - 0.5) * 0.3, x, y));
                // Ridge highlights.
                put(x, m, hex('#9cc46a'));
                put(x, nr, hex('#7cb650'));
            }
            // Standing stones on the far hilltop.
            const sx = Math.round(W * 0.5);
            for (let i = 0; i < 7; i++) {
                const a = (i / 7) * Math.PI * 2;
                const x = Math.round(sx + Math.cos(a) * 10), y0 = far(sx) + Math.round(Math.sin(a) * 2) + 1;
                const h = 3 + (i % 3 === 0 ? 2 : 1);
                for (let k = 0; k < h; k++) {
                    put(x, y0 - k, hex('#5e625c'));
                    put(x + 1, y0 - k, hex(k === h - 1 ? '#a2a69a' : '#868a80'));
                }
            }
            // Hedges and field lines on the middle slope.
            for (let x = 0; x < W; x++) {
                const y = mid(x) + 8 + Math.round(Math.sin(x * 0.025) * 3);
                if (hash(x, 9) < 0.85) put(x, y, hex('#3a6a30'));
                if (x % 47 < 2) for (let k = 0; k < 12; k++) put(x + Math.round(k * 0.4), mid(x) + 2 + k, hex('#3e6e32'));
            }
            // A white cottage far off.
            const hx = Math.round(W * 0.73), hy = mid(hx) + 4;
            for (let y = hy - 3; y <= hy; y++) for (let x = hx; x < hx + 7; x++) put(x, y, hex('#e6e4da'));
            for (let x = hx - 1; x < hx + 8; x++) put(x, hy - 4, hex('#4a4a52'));
            for (let x = hx; x < hx + 7; x++) put(x, hy - 5, hex('#5a5a62'));
            put(hx + 2, hy - 2, hex('#3a3a40'));
            put(hx + 5, hy - 1, hex('#3a3a40'));
            put(hx + 5, hy, hex('#3a3a40'));
            // Dry-stone wall: snakes from bottom left up across the near and middle slopes.
            const wallPath = (s: number): [number, number, number] => {
                const x = -10 + s * (W + 20);
                const y = H - 6 - s * (H - mid(x) - 10) + Math.sin(s * 7) * 6 * (1 - s);
                return [x, y, 5 - s * 3.6];
            };
            const stones: RGB[] = ['#9a9a8e', '#82827a', '#b2b0a2', '#6e6e68'].map(hex);
            for (let s = 0; s <= 1; s += 0.0012) {
                const [x, y, h] = wallPath(s);
                const px = Math.round(x);
                if (px < 0 || px >= W) continue;
                for (let k = 0; k < Math.round(h); k++) {
                    const course = Math.floor(k / Math.max(1, h / 3));
                    const stone = Math.floor((px + course * 2) / Math.max(1, Math.round(h * 0.8)));
                    const gap = (px + course * 2) % Math.max(2, Math.round(h * 0.8)) === 0;
                    put(px, Math.round(y) - k, gap ? hex('#4e4e4a') : k === Math.round(h) - 1 ? stones[2] : stones[(stone + course) % 2]);
                }
                put(px, Math.round(y) + 1, hex('#2a4a22'));
            }
        });

        // Hill mask, so cloud shadows only fall on land.
        const landMask = pixels(W, H, put => {
            const c = hex('#000000');
            for (let x = 0; x < W; x++) for (let y = far(x); y < H; y++) put(x, y, c);
        });
        const shadowNoise = wrappingNoise(W, H, 46, random);
        const shadow = pixels(W, H, put => {
            const c = hex('#1a2e3a');
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) if (shadowNoise(x, y * 1.8) > 0.5 + bayer(x, y) * 0.14) put(x, y, c);
        });
        const shade = canvas(W, H);

        // Clouds: big soft heaps with grey undersides.
        const clouds = Array.from({length: 5}, (_, i) => {
            const cw = 40 + Math.floor(random() * 40), ch = 22;
            const c = pixels(cw, ch, put => {
                const puffs = 5 + Math.floor(random() * 3);
                for (let p = 0; p < puffs; p++) {
                    const px = 6 + (p / (puffs - 1)) * (cw - 12), r = 4 + Math.round(random() * 4 + (p % 2 ? 2 : 0));
                    disc(put, px, ch - r - 1, r, (x, y) => ditherPick(['#f4f2ea', '#dcdcd6', '#b4bcc2', '#98a4ae'].map(hex), (y - (ch - 2 * r)) / (2 * r) * 0.9 + 0.1, x, y));
                }
            });
            return {c, x: (i / 5) * (W + 80) + random() * 20, y: 2 + i * 9 + Math.round(random() * 4), speed: 2 + i * 0.6};
        });

        const sheep = Array.from({length: 6}, () => {
            const x = Math.round(W * (0.25 + random() * 0.55));
            const onNear = random() < 0.4;
            return {x, y: (onNear ? near(x) + 10 + Math.round(random() * 14) : mid(x) + 12 + Math.round(random() * 10)), big: onNear, ph: random() * 20};
        });
        const tufts = Array.from({length: Math.ceil(W / 2)}, (_, i) => ({
            x: i * 2 + Math.floor(random() * 2), h: 5 + Math.floor(random() * 8), ph: random() * 6,
            c: random() < 0.5 ? '#2e5a26' : '#3c7030'
        }));
        const birds = Array.from({length: 3}, () => ({x: random() * W, y: 30 + random() * 25, s: 5 + random() * 4, p: random() * 4}));

        return (ctx, t, beat) => {
            ctx.drawImage(land.canvas, 0, 0);
            for (const c of clouds) {
                const cw = c.c.canvas.width;
                const x = Math.round(((c.x + t * c.speed) % (W + cw)) - cw);
                ctx.drawImage(c.c.canvas, x, c.y);
            }

            // Cloud shadows slide over the hills.
            const off = Math.floor(t * 5) % W;
            const s = shade.ctx;
            s.globalCompositeOperation = 'source-over';
            s.clearRect(0, 0, W, H);
            s.drawImage(shadow.canvas, off, 0);
            s.drawImage(shadow.canvas, off - W, 0);
            s.globalCompositeOperation = 'destination-in';
            s.drawImage(landMask.canvas, 0, 0);
            ctx.globalAlpha = 0.36;
            ctx.drawImage(shade.canvas, 0, 0);
            ctx.globalAlpha = 1;

            // Sheep: woolly blobs that wander a pixel now and then and dip to graze.
            for (const sh of sheep) {
                const step = Math.floor((t + sh.ph) / 6);
                const dx = Math.round((hash(step, sh.ph) - 0.5) * 4);
                const graze = Math.sin((t + sh.ph) * 0.7) > 0;
                const x = sh.x + dx, y = sh.y;
                const w = sh.big ? 5 : 4, h = sh.big ? 3 : 2;
                ctx.fillStyle = '#2a2a2a';
                ctx.fillRect(x + 1, y + h, 1, 1);
                ctx.fillRect(x + w - 2, y + h, 1, 1);
                ctx.fillStyle = '#eeebe0';
                ctx.fillRect(x, y, w, h);
                ctx.fillStyle = '#c8c4b8';
                ctx.fillRect(x, y + h - 1, w, 1);
                ctx.fillStyle = '#2a2a2a';
                ctx.fillRect(x + w, y + (graze ? 1 : 0), sh.big ? 2 : 1, sh.big ? 2 : 1);
            }

            ctx.fillStyle = '#3a4048';
            for (const b of birds) {
                const x = Math.round(((b.x + t * b.s) % (W + 20)) - 10), y = Math.round(b.y + Math.sin(t + b.p) * 3);
                const up = Math.floor(t * 3 + b.p) % 2 === 0;
                ctx.fillRect(x, y, 1, 1);
                ctx.fillRect(x - 1, y - (up ? 1 : 0), 1, 1);
                ctx.fillRect(x + 1, y - (up ? 1 : 0), 1, 1);
            }

            // Wind gusts run left to right through the near grass.
            for (const g of tufts) {
                const wave = Math.max(0, Math.sin(g.x * 0.035 - t * 1.8));
                const lean = Math.round(wave * 3 + Math.sin(t * 2.2 + g.ph) * 0.8);
                const y0 = H - g.h;
                ctx.fillStyle = g.c;
                ctx.fillRect(g.x, H - Math.ceil(g.h / 2), 1, Math.ceil(g.h / 2));
                ctx.fillRect(g.x + Math.round(lean / 2), y0, 1, Math.ceil(g.h / 2));
                ctx.fillStyle = wave > 0.6 ? '#a6d070' : '#5c9440';
                ctx.fillRect(g.x + lean, y0 - 1, 1, 2);
            }

            // A broad shaft of sun through the clouds, brighter on the beat.
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.02 + 0.015 * pulse(beat);
            ctx.fillStyle = '#fff2c8';
            const sx = W * 0.5 + Math.sin(t * 0.05) * W * 0.2;
            for (const spread of [0, 8, 16]) {
                ctx.beginPath();
                ctx.moveTo(sx - 4 - spread / 2, 0);
                ctx.lineTo(sx + 8 + spread / 2, 0);
                ctx.lineTo(sx + 36 + spread * 1.5, H);
                ctx.lineTo(sx - 16 - spread * 1.5, H);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        };
    }
};
