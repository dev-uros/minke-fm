import {Backdrop, canvas, css, disc, ditherPick, hash, hex, pixels, pulse, RGB, rng} from '../pixel';

/**
 * A side-scrolling platformer level at dusk: a little hooded hero runs on
 * forever, hopping stumps and leaping gaps, snatching gems from the air,
 * while hills and clouds slide by in parallax behind.
 */
export const PLATFORMER: Backdrop = {
    id: 'screen-platformer',
    name: 'Endless level',
    bpm: 120,
    create(W, H) {
        const random = rng(17);
        const T = 8;
        const groundTop = H - 32;
        const speed = 42;
        const heroX = Math.round(W * 0.4);
        const L = W * 2;
        const horizon = 132;
        const sky = ['#1a2250', '#2a3c7a', '#46619c', '#7a8cb4', '#d8a890', '#f4c890'].map(hex);

        const back = pixels(W, H, put => {
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, y / horizon, x, y));
            for (let i = 0; i < 40; i++) put(random() * W, random() * 40, hex('#ffffff'), 60 + random() * 120);
            const sun = ['#fff4c8', '#ffd890'].map(hex);
            disc(put, Math.round(W * 0.68), 92, 16, (x, y) => ditherPick(sun, (y - 76) / 32, x, y));
        });

        // A strip that repeats every L pixels, from a height function made of whole sine waves.
        const ridge = (seed: number, base: number, amp: number) => {
            const r = rng(seed);
            const waves = [1, 2, 3, 5, 8].map(f => ({f, a: r() / f, p: r() * Math.PI * 2}));
            return (x: number) => Math.round(base - amp * waves.reduce((s, w) => s + w.a * Math.sin(x / L * Math.PI * 2 * w.f + w.p), 0));
        };
        const mountains = ridge(3, 108, 26);
        const far = pixels(L, H, put => {
            const rock = ['#3a3f78', '#4a5590', '#6a76a8'].map(hex);
            for (let x = 0; x < L; x++) {
                const top = mountains(x);
                for (let y = top; y < H; y++) {
                    const snow = y - top < 3 && top < 92;
                    put(x, y, snow ? hex('#d8dcf0') : ditherPick(rock, 0.9 - (y - top) / 50 + Math.sin(x * 0.3) * 0.1, x, y));
                }
            }
        });
        const hills = ridge(9, 128, 14);
        const mid = pixels(L, H, put => {
            const green = ['#1f4a4a', '#2a6a5a', '#3f8a62', '#6aa868'].map(hex);
            for (let x = 0; x < L; x++) {
                const top = hills(x);
                for (let y = top; y < H; y++) put(x, y, ditherPick(green, 1 - (y - top) / 30 - (top - 114) / 30, x, y));
            }
            // Round little trees along the hill line.
            for (let i = 0; i < L / 18; i++) {
                const x = Math.floor(random() * L), y = hills(x);
                for (let j = 0; j < 6; j++) put(x, y - j, hex('#2a1f2a'));
                disc((px, py, c) => put(((px % L) + L) % L, py, c), x, y - 7, 3 + Math.floor(random() * 2),
                    (px, py) => ditherPick(['#1f4a3a', '#2f6a48', '#4a8a50'].map(hex), 0.8 - (py - y + 10) / 8, px, py));
            }
        });
        const clouds = pixels(L, H, put => {
            const shade = ['#b8a8c8', '#f0d8d0', '#fff4e8'].map(hex);
            for (let c = 0; c < 7; c++) {
                const cx = random() * L, cy = 20 + random() * 40, n = 3 + Math.floor(random() * 3);
                for (let k = 0; k < n; k++) {
                    const ox = (k - n / 2) * 7 + random() * 4, r = 4 + Math.floor(random() * 5);
                    disc((px, py, col) => put(((px % L) + L) % L, py, col), Math.round(cx + ox), Math.round(cy - r / 2), r,
                        (px, py) => py > cy + 1 ? shade[0] : ditherPick(shade, 1 - (py - cy + r) / (r * 1.6), px, py));
                }
            }
        });

        // Tiles.
        const tile = (paint: (put: (x: number, y: number, c: RGB) => void) => void) => pixels(T, T, paint).canvas;
        const grass = tile(put => {
            for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
                let c = hex('#6a3a2a');
                if (y < 3) c = y === 0 ? hex('#a8e070') : hex('#5ab048');
                else if (y === 3) c = (x % 3 === 1) ? hex('#5ab048') : hex('#3a7a3a');
                else if ((x * 5 + y * 3) % 11 === 0) c = hex('#8a5a3a');
                put(x, y, c);
            }
        });
        const dirt = tile(put => {
            for (let y = 0; y < T; y++) for (let x = 0; x < T; x++)
                put(x, y, (x * 5 + y * 3) % 11 === 0 ? hex('#8a5a3a') : (x * 3 + y * 7) % 13 === 0 ? hex('#4a2a22') : hex('#6a3a2a'));
        });
        const stone = tile(put => {
            for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
                const edge = x === 0 || y === T - 1 || x === T - 1;
                put(x, y, y < 2 ? (y === 0 ? hex('#a8e070') : hex('#5ab048')) : edge ? hex('#3a3f5a') : (x + y) % 5 === 0 ? hex('#8a90b0') : hex('#6a6f8f'));
            }
        });
        const stump = tile(put => {
            for (let y = 0; y < T; y++) for (let x = 1; x < T - 1; x++)
                put(x, y, y === 0 ? hex('#d8b080') : x === 1 ? hex('#4a2a1a') : x % 3 === 0 ? hex('#5a341f') : hex('#7a4a2a'));
        });

        // The level is made of 16-tile chunks, each decided by a hash of its index.
        const CH = 16 * T;
        const chunk = (k: number) => {
            const gap = k > 0 && hash(k, 1.3) < 0.7 ? 2 + (hash(k, 2.7) < 0.5 ? 1 : 0) : 0;
            const plat = hash(k, 4.1) < 0.65 ? {start: 2 + Math.floor(hash(k, 5.3) * 3), len: 3 + Math.floor(hash(k, 6.1) * 2), rows: 4 + Math.floor(hash(k, 7.7) * 2)} : null;
            const obstacle = !gap && k > 0;
            return {gap, plat, obstacle};
        };
        const gapStart = 10, stumpAt = 9;
        const solid = (tileIndex: number) => {
            const k = Math.floor(tileIndex / 16), i = ((tileIndex % 16) + 16) % 16;
            const c = chunk(k);
            return !(c.gap && i >= gapStart && i < gapStart + c.gap);
        };
        // Jump for the chunk the hero is in: [start, length, height], world x of the hero's centre.
        const jumpFor = (k: number): [number, number, number] | null => {
            const c = chunk(k);
            if (c.gap) return [k * CH + (gapStart - 1.4) * T, (c.gap + 2.8) * T, 16 + c.gap * 5];
            if (c.obstacle) return [k * CH + (stumpAt - 1.6) * T, 4.2 * T, 14];
            return null;
        };

        const hero = {
            run1: ['...HHHH..', '..HHHHHH.', '.hHHFFFF.', '.hHFFEFE.', '.hHFFFFF.', 'cCCCCCC..', 'c.BBBBB..', '..BBBBBb.', '..bBBBb..', '..K...K..', '.KK...KK.'],
            run2: ['...HHHH..', '..HHHHHH.', '.hHHFFFF.', '.hHFFEFE.', '.hHFFFFF.', '.CCCCCC..', 'cc.BBBB..', '..BBBBBb.', '..bBBBb..', '...KK....', '....KK...'],
            jump: ['...HHHH..', '..HHHHHH.', '.hHHFFFF.', '.hHFFEFE.', '.hHFFFFF.', 'cCCCCCC..', 'c.BBBBBB.', '..BBBBB..', '..bBBBb..', '..KK.KK..', '.........']
        };
        const heroCols: Record<string, string> = {
            H: '#2fb8a8', h: '#1f7a78', F: '#1a1426', E: '#f8f8ff', C: '#ff7a3a', c: '#e8502a',
            B: '#f2e6c8', b: '#b8a888', K: '#3a2420'
        };
        const sprites = Object.fromEntries(Object.entries(hero).map(([name, rows]) => {
            const s = canvas(9, 11);
            rows.forEach((row, y) => [...row].forEach((ch, x) => {
                if (ch === '.') return;
                s.ctx.fillStyle = heroCols[ch];
                s.ctx.fillRect(x, y, 1, 1);
            }));
            return [name, s.canvas];
        })) as Record<keyof typeof hero, HTMLCanvasElement>;

        const gem = (ctx: CanvasRenderingContext2D, x: number, y: number, t: number, colours: [string, string, string]) => {
            const w = [2, 1, 0, 1][Math.floor(t * 8 + x * 0.1) & 3];
            const rows = [0, 1, 2, 2, 1, 0];
            rows.forEach((r, j) => {
                const hw = Math.round(r * w / 2);
                ctx.fillStyle = j < 2 ? colours[0] : j < 4 ? colours[1] : colours[2];
                ctx.fillRect(x - hw, y + j, hw * 2 + 1, 1);
            });
            if (w === 2) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x - 1, y + 1, 1, 1);
            }
        };
        const cyan: [string, string, string] = ['#c8ffff', '#5af0ff', '#2a8acf'];
        const pink: [string, string, string] = ['#ffd8f0', '#ff6ac8', '#b02a8a'];

        return (ctx, t, beat) => {
            const kick = pulse(beat);
            const scroll = t * speed + CH * 0.5;
            const layer = (img: HTMLCanvasElement, f: number) => {
                const x = -Math.floor((scroll * f) % L);
                ctx.drawImage(img, x, 0);
                ctx.drawImage(img, x + L, 0);
            };

            ctx.drawImage(back.canvas, 0, 0);
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = css([255, 200, 140], 0.05 + 0.04 * kick);
            ctx.beginPath();
            ctx.arc(Math.round(W * 0.68), 92, 24 + kick * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            layer(clouds.canvas, 0.08);
            layer(far.canvas, 0.15);
            layer(mid.canvas, 0.4);

            // Ground, floating stone ledges, stumps.
            const first = Math.floor(scroll / T) - 1;
            const off = -Math.round(scroll - first * T);
            for (let i = 0; i < W / T + 3; i++) {
                const ti = first + i, x = off + i * T;
                const k = Math.floor(ti / 16), local = ((ti % 16) + 16) % 16;
                const c = chunk(k);
                if (solid(ti)) {
                    ctx.drawImage(grass, x, groundTop);
                    for (let r = 1; r < 4; r++) ctx.drawImage(dirt, x, groundTop + r * T);
                    if (!solid(ti - 1)) { ctx.fillStyle = '#3a2018'; ctx.fillRect(x, groundTop + 2, 1, H); }
                    if (!solid(ti + 1)) { ctx.fillStyle = '#3a2018'; ctx.fillRect(x + T - 1, groundTop + 2, 1, H); }
                    if (hash(ti, 8.8) < 0.18) {
                        ctx.fillStyle = hash(ti, 9.9) < 0.5 ? '#ffe070' : '#ff8ab8';
                        ctx.fillRect(x + 3, groundTop - 2, 1, 1);
                        ctx.fillStyle = '#3a7a3a';
                        ctx.fillRect(x + 3, groundTop - 1, 1, 1);
                    }
                } else {
                    ctx.fillStyle = '#120c20';
                    ctx.fillRect(x, groundTop + 6, T, H);
                }
                if (c.obstacle && local === stumpAt) ctx.drawImage(stump, x, groundTop - T);
                if (c.plat && local >= c.plat.start && local < c.plat.start + c.plat.len) {
                    const py = groundTop - c.plat.rows * T;
                    ctx.drawImage(stone, x, py);
                    if (local === c.plat.start + 1 || local === c.plat.start + c.plat.len - 1)
                        gem(ctx, x + 4, py - 9 - (kick > 0.5 ? 1 : 0), t, pink);
                }
            }

            // The hero, and gems strung along each jump to collect.
            const hw = scroll + heroX;
            const k = Math.floor(hw / CH);
            let lift = 0, airborne = false;
            for (const kk of [k - 1, k, k + 1, k + 2, k + 3]) {
                const j = jumpFor(kk);
                if (!j) continue;
                const [start, len, height] = j;
                if (hw >= start && hw <= start + len) {
                    const u = (hw - start) / len;
                    lift = height * 4 * u * (1 - u);
                    airborne = true;
                }
                if (!chunk(kk).gap) continue;
                for (const u of [0.3, 0.5, 0.7]) {
                    const gx = start + u * len, gy = groundTop - 6 - height * 4 * u * (1 - u);
                    const sx = Math.round(gx - scroll);
                    if (gx > hw + 2) gem(ctx, sx, Math.round(gy) - 4, t, cyan);
                    else if (hw - gx < 20) {
                        const a = (hw - gx) / 20;
                        ctx.fillStyle = css([255, 255, 220], 1 - a);
                        const r = Math.round(2 + a * 6);
                        for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) ctx.fillRect(sx + dx, Math.round(gy) - 1 + dy, 1, 1);
                    }
                }
            }
            const frame = airborne ? sprites.jump : (Math.floor(t * 8) % 2 ? sprites.run2 : sprites.run1);
            const bob = !airborne && Math.floor(t * 8) % 2 ? 1 : 0;
            const hy = Math.round(groundTop - 11 - lift) - bob;
            if (!airborne) {
                ctx.fillStyle = 'rgba(20,10,30,0.35)';
                ctx.fillRect(heroX - 3, groundTop, 7, 1);
            }
            ctx.drawImage(frame, heroX - 4, hy);
            // Dust kicked up behind the running feet.
            if (!airborne) {
                ctx.fillStyle = 'rgba(240,220,190,0.5)';
                const d = (t * 8) % 1;
                ctx.fillRect(Math.round(heroX - 5 - d * 6), groundTop - 1 - Math.round(d * 2), 1, 1);
            }
        };
    }
};
