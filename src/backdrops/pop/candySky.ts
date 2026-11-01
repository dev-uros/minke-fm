import {Backdrop, bayer, css, ditherPick, hash, hex, pixels, pulse, RGB, rng} from '../pixel';
import {sprite} from './sprite';

/**
 * A cotton-candy sky at dusk: a pastel rainbow behind puffy pink and lilac
 * clouds drifting at different speeds, with bubbles, hearts and stars floating
 * up through it and sparkles winking on the beat.
 */
export const CANDY_SKY: Backdrop = {
    id: 'pop-candy-sky',
    name: 'Candy sky',
    bpm: 104,
    create(W, H) {
        const random = rng(64);
        const cx = Math.round(W / 2);

        const sky = ['#3a2f7a', '#56419a', '#7a52b0', '#a462b8', '#cf76b8', '#ee90b0', '#ffb0a8', '#ffcaa8'].map(hex);
        const rainbow = ['#ff9ab8', '#ffc39a', '#fff0a0', '#b8f0b0', '#a8d8ff', '#c8b0ff'].map(hex);

        const back = pixels(W, H, put => {
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, y / H, x, y));
            // Faint stars still out at the top.
            for (let i = 0; i < 40; i++) put(random() * W, random() * 50, hex('#fff4ff'), 50 + random() * 110);
            // A soft pastel rainbow arching behind everything.
            const rx = cx, ry = H + 30, r0 = Math.round(H * 0.72);
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const d = Math.hypot(x - rx, (y - ry) * 1.05);
                    const band = Math.floor((r0 - d) / 3);
                    if (band < 0 || band >= rainbow.length) continue;
                    const a = 0.3 + 0.3 * (1 - y / H);
                    if (a > bayer(x, y)) put(x, y, rainbow[band], 255);
                }
            }
        });

        // Puffy clouds built from overlapping discs, lit from above.
        const cloud = (w: number, h: number, pal: RGB[], seed: number) => {
            const r = rng(seed);
            const n = Math.round(w / 7) + 3;
            const puffs = Array.from({length: n}, (_, i) => {
                const u = i / (n - 1);
                const rad = h * (0.35 + 0.45 * Math.sin(u * Math.PI)) * (0.75 + r() * 0.4);
                return {x: 4 + u * (w - 8), y: h - rad * 0.8 - 2, r: rad};
            });
            return pixels(w + 8, h + 4, put => {
                for (let y = 0; y < h + 4; y++) {
                    for (let x = 0; x < w + 8; x++) {
                        let inside = false, top = 0;
                        for (const p of puffs) {
                            const dx = x - p.x, dy = y - p.y;
                            if (dx * dx + dy * dy <= p.r * p.r) {
                                inside = true;
                                top = Math.max(top, (p.y - y) / p.r * 0.5 + 0.5 - dx / p.r * 0.1);
                            }
                        }
                        if (!inside || y > h) continue;
                        const flat = y > h - 2 ? -0.3 : 0;
                        put(x, y, ditherPick(pal, Math.min(1, top * 1.1 + flat), x, y));
                    }
                }
            });
        };
        const pinkPal = ['#c86aa8', '#e890c0', '#ffb8d8', '#ffdcea', '#fff4f8'].map(hex);
        const lilacPal = ['#8a6ac0', '#a88ad8', '#c8b0ee', '#e4d8fa', '#f8f2ff'].map(hex);
        const peachPal = ['#e0807a', '#f4a08e', '#ffc4a8', '#ffe2cc', '#fff6ec'].map(hex);
        const layers = [
            {speed: 1.2, y: 34, items: [cloud(40, 14, lilacPal, 1), cloud(30, 11, lilacPal, 2), cloud(46, 15, lilacPal, 3)]},
            {speed: 2.6, y: 72, items: [cloud(64, 20, pinkPal, 4), cloud(50, 17, peachPal, 5)]},
            {speed: 4.5, y: 132, items: [cloud(96, 30, pinkPal, 6), cloud(80, 26, peachPal, 7), cloud(70, 24, lilacPal, 8)]}
        ].map(l => {
            // Spread the clouds of a layer along a loop wider than the screen.
            let x = 0;
            const placed = l.items.map((c, i) => {
                const p = {c: c.canvas, x, dy: Math.round((hash(i, l.y) - 0.5) * 16)};
                x += c.canvas.width + 30 + Math.round(random() * 50);
                return p;
            });
            return {speed: l.speed, y: l.y, loop: Math.max(x, W + 120), placed};
        });

        // A bank of cloud along the bottom that never leaves.
        const bank = pixels(W, H, put => {
            const pal = ['#d07ab0', '#ee9cc4', '#ffc0d8', '#ffe0ec'].map(hex);
            const top = (x: number) => H - 18 - Math.round(Math.abs(Math.sin(x * 0.07)) * 8 + Math.abs(Math.sin(x * 0.031 + 1)) * 6);
            for (let x = 0; x < W; x++) {
                const t = top(x);
                for (let y = t; y < H; y++) put(x, y, ditherPick(pal, 1 - (y - t) / 22, x, y));
            }
        });

        const heartS = sprite(['.#.#.', '#####', '#####', '.###.', '..#..'], {'#': '#ff5a9a'});
        const heartL = sprite(['.##.##.', '#hh####', '#h#####', '#######', '.#####.', '..###..', '...#...'], {'#': '#ff4a8a', h: '#ffc8dc'});
        const star = sprite(['..#..', '..#..', '#####', '.###.', '.#.#.'], {'#': '#ffe46a'});

        type Floater = {kind: 'bubble' | 'heart' | 'star'; x: number; y: number; speed: number; seed: number; r: number};
        const floaters: Floater[] = Array.from({length: 26}, (_, i) => ({
            kind: i % 3 === 0 ? 'heart' : i % 3 === 1 ? 'bubble' : 'star',
            x: random() * W,
            y: random() * H,
            speed: 4 + random() * 6,
            seed: random() * 20,
            r: 2 + Math.floor(random() * 4)
        }));
        const sparkles = Array.from({length: 18}, () => ({x: Math.floor(random() * W), y: Math.floor(random() * (H - 30)), seed: random() * 30}));

        const bubbleRim = ['#ffffff', '#c8f0ff', '#ffd0f0', '#fff4b0'];

        return (ctx, t, beat) => {
            const kick = pulse(beat);
            ctx.drawImage(back.canvas, 0, 0);

            for (const l of layers) {
                const shift = (t * l.speed) % l.loop;
                for (const p of l.placed) {
                    let x = Math.round(p.x - shift);
                    if (x < -p.c.width) x += l.loop;
                    ctx.drawImage(p.c, x, l.y + p.dy - p.c.height);
                    if (x + l.loop < W) ctx.drawImage(p.c, x + l.loop, l.y + p.dy - p.c.height);
                }
            }

            // Bubbles, hearts and stars rising and swaying.
            for (const f of floaters) {
                const y = Math.round(H + 10 - ((H + 20 - f.y + t * f.speed) % (H + 20)));
                const x = Math.round(f.x + Math.sin(t * 0.8 + f.seed) * 6);
                if (f.kind === 'bubble') {
                    const r = f.r;
                    for (let a = 0; a < 16; a++) {
                        const ang = (a / 16) * Math.PI * 2;
                        ctx.fillStyle = css(hex(bubbleRim[(a + Math.floor(t * 3 + f.seed)) % 4]), 0.75);
                        ctx.fillRect(Math.round(x + Math.cos(ang) * r), Math.round(y + Math.sin(ang) * r), 1, 1);
                    }
                    ctx.fillStyle = 'rgba(255,255,255,0.12)';
                    ctx.fillRect(x - r + 1, y - r + 1, r * 2 - 1, r * 2 - 1);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(x - Math.ceil(r / 2), y - Math.ceil(r / 2), 1, 1);
                } else if (f.kind === 'heart') {
                    // Hearts swell on the beat.
                    const img = f.r > 3 || kick > 0.5 ? heartL : heartS;
                    ctx.drawImage(img, x - Math.floor(img.width / 2), y - Math.floor(img.height / 2));
                } else {
                    const tw = Math.sin(t * 2 + f.seed) > 0;
                    ctx.globalAlpha = tw ? 1 : 0.7;
                    ctx.drawImage(star, x - 2, y - 2);
                    ctx.globalAlpha = 1;
                }
            }

            ctx.drawImage(bank.canvas, 0, Math.round(Math.sin(t * 0.4) * 1.2));

            // Sparkles wink, brightest on the beat.
            for (const s of sparkles) {
                const life = (t * 0.5 + s.seed) % 3;
                if (life > 1) continue;
                const a = Math.sin(life * Math.PI) * (0.6 + 0.4 * kick);
                const big = a > 0.7;
                const sx = s.x + Math.round(hash(s.seed, Math.floor((t * 0.5 + s.seed) / 3)) * 40) % W;
                ctx.fillStyle = css([255, 255, 240], a);
                ctx.fillRect(sx, s.y, 1, 1);
                ctx.fillStyle = css([255, 240, 250], a * 0.7);
                ctx.fillRect(sx - 1, s.y, 3, 1);
                ctx.fillRect(sx, s.y - 1, 1, 3);
                if (big) {
                    ctx.fillStyle = css([255, 230, 250], a * 0.35);
                    ctx.fillRect(sx - 3, s.y, 7, 1);
                    ctx.fillRect(sx, s.y - 3, 1, 7);
                }
            }
        };
    }
};
