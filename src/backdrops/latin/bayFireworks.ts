import {Backdrop, canvas, css, ditherPick, hash, hex, pixels, pulse, RGB, rng} from '../pixel';
import {paintWindows, skyline} from '../skyline';

/**
 * Carnival night over a bay: a dome-shaped mountain and the lit city along the
 * shore, fireworks launched on the beat and bursting on the next one, all of it
 * mirrored and wobbling in the water, with a few boats rocking at anchor.
 */
export const BAY_FIREWORKS: Backdrop = {
    id: 'latin-bay-fireworks',
    name: 'Carnival fireworks',
    bpm: 120,
    create(W, H) {
        const random = rng(61);
        const shore = 112;
        const mx = Math.round(W * 0.66);
        const cable = (f: number) => ({x: Math.round(mx - 34 + f * 34), y: Math.round(shore - 34 - f * 40 + Math.sin(f * Math.PI) * 6)});
        const sky: RGB[] = ['#03030c', '#070a1e', '#0e1430', '#1a1c44', '#2e2254', '#5a2a5e'].map(hex);

        // Sky, mountains, city: everything above the waterline.
        const land = pixels(W, shore, put => {
            for (let y = 0; y < shore; y++) for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, y / shore, x, y));
            for (let i = 0; i < 70; i++) put(random() * W, random() * shore * 0.7, hex('#d8dcff'), 40 + random() * 140);
            const far = hex('#141634'), near = hex('#0a0b1c'), rim = hex('#2c2c5a');
            for (let x = 0; x < W; x++) {
                // Rolling far hills, and the steep dome rising out of the bay.
                const hills = 22 + Math.sin(x * 0.03) * 7 + Math.sin(x * 0.11 + 1) * 3;
                const dome = 72 * Math.exp(-Math.pow(Math.abs(x - mx) / 19, 3.4));
                const little = 34 * Math.exp(-Math.pow(Math.abs(x - mx + 34) / 14, 2.2));
                const hTop = Math.round(shore - hills);
                const dTop = Math.round(shore - Math.max(dome, little));
                for (let y = hTop; y < shore; y++) put(x, y, y === hTop ? rim : far);
                if (Math.max(dome, little) > 4) for (let y = dTop; y < shore; y++) put(x, y, y === dTop ? rim : near);
            }
            // A cable-car line strung to the summit, with two tiny lit cabins drawn later.
            for (let i = 0; i <= 60; i++) {
                const p = cable(i / 60);
                put(p.x, p.y, hex('#3a3a6a'));
            }
        });
        const city = skyline(land.ctx, {
            from: 0, to: W, base: shore, minHeight: 3, maxHeight: 13, minWidth: 4, maxWidth: 10,
            colour: '#06060f', lit: ['#ffd27a', '#ffe8b0', '#ff9a6a', '#b8d0ff'], litChance: 0.45, grid: [2, 3, 1, 1]
        }, random);
        const upper = canvas(W, shore);
        const water: RGB[] = ['#040612', '#070b1c', '#0b1028'].map(hex);
        const waterBase = pixels(W, H - shore, put => {
            for (let y = 0; y < H - shore; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(water, 1 - y / (H - shore) + ((x + y * 7) % 13 === 0 ? 0.3 : 0), x, y));
        });

        const palettes: RGB[][] = [
            ['#ff4f7a', '#ffd0e0'], ['#ffd23a', '#fff2b0'], ['#3ae0ff', '#d0f8ff'],
            ['#9a5aff', '#e0c8ff'], ['#5aff8a', '#d8ffe0'], ['#ff8a2a', '#ffe0b0']
        ].map(p => p.map(hex));

        const boats = Array.from({length: 3}, (_, i) => ({x: Math.round(W * (0.2 + i * 0.3) + random() * 20), y: shore + 22 + i * 13 + Math.round(random() * 6), ph: random() * 6}));

        const fireworks = (ctx: CanvasRenderingContext2D, t: number, beat: number) => {
            let flash = 0;
            const spb = 60 / 120;
            const now = Math.floor(beat);
            let tint: RGB = palettes[0][0];
            for (let n = now - 7; n <= now; n++) {
                if (n < 0 || hash(n, 7) < 0.3) continue;   // some beats stay dark
                const launch = n * spb;
                const bang = launch + spb;          // bursts land on the next beat
                const age = t - launch;
                const bx = Math.round(W * (0.2 + 0.6 * hash(n, 1)));
                const by = Math.round(20 + hash(n, 2) * 30);
                const pal = palettes[Math.floor(hash(n, 3) * palettes.length)];
                const kind = Math.floor(hash(n, 4) * 3);   // 0 peony, 1 willow, 2 ring
                if (t < bang) {
                    // Rising shell with a sparkling tail.
                    const f = age / spb;
                    const ease = 1 - Math.pow(1 - f, 2);
                    const x = bx + Math.round(Math.sin(f * 6 + n) * 1), y = Math.round(shore - (shore - by) * ease);
                    ctx.fillStyle = css(pal[1], 0.9);
                    ctx.fillRect(x, y, 1, 2);
                    for (let k = 1; k < 6; k++) {
                        ctx.fillStyle = css(hex('#ffb060'), 0.5 - k * 0.08);
                        ctx.fillRect(x + (hash(n, k + t) < 0.5 ? 0 : 1), y + k * 2, 1, 1);
                    }
                    continue;
                }
                const tau = t - bang;
                const life = kind === 1 ? 3.2 : 2.4;
                if (tau > life) continue;
                const fade = Math.sqrt(1 - tau / life);
                const fl = Math.pow(Math.max(0, 1 - tau / 0.7), 2);
                if (fl > flash) {
                    flash = fl;
                    tint = pal[0];
                }
                const count = kind === 2 ? 40 : 56;
                const speed = kind === 2 ? 48 : kind === 1 ? 44 : 58;
                const drag = 1.8, grav = kind === 1 ? 9 : 5;
                for (let i = 0; i < count; i++) {
                    const a = (i / count) * Math.PI * 2 + hash(n, 9) * 3;
                    const sp = kind === 2 ? speed : speed * (0.55 + 0.45 * hash(n, i + 20));
                    for (let k = 0; k < 3; k++) {
                        const tt = Math.max(0, tau - k * 0.07);
                        const d = (sp * (1 - Math.exp(-drag * tt))) / drag;
                        const x = bx + Math.cos(a) * d;
                        const y = by + Math.sin(a) * d * 0.9 + grav * tt * tt;
                        const twinkle = kind === 1 || hash(i, Math.floor(t * 15)) > 0.25 ? 1 : 0.3;
                        const c = tau < 0.25 || k === 0 ? pal[1] : pal[0];
                        ctx.fillStyle = css(kind === 1 ? hex('#ffc860') : c, fade * twinkle * (1 - k * 0.28));
                        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
                    }
                }
            }
            return {flash, tint};
        };

        return (ctx, t, beat) => {
            const b = pulse(beat);
            const u = upper.ctx;
            u.drawImage(land.canvas, 0, 0);
            paintWindows(u, city, t);
            // Cable cars crawling up and down.
            for (const off of [0, 0.5]) {
                const f = Math.abs(((t / 40 + off) % 1) * 2 - 1);
                const p = cable(f);
                u.fillStyle = '#ffd27a';
                u.fillRect(p.x, p.y + 1, 2, 1);
            }
            u.globalCompositeOperation = 'lighter';
            const {flash, tint} = fireworks(u, t, beat);
            u.fillStyle = css(tint, 0.1 * flash);
            u.fillRect(0, 0, W, shore);
            u.globalCompositeOperation = 'source-over';

            ctx.drawImage(upper.canvas, 0, 0);
            ctx.drawImage(waterBase.canvas, 0, shore);

            // The reflection: rows of the sky flipped, wobbling more further out.
            ctx.globalAlpha = 0.5;
            for (let y = shore; y < H; y++) {
                const k = y - shore;
                const src = shore - 1 - Math.round(k * 1.4);
                if (src < 0) break;
                const wob = Math.round(Math.sin(t * 2 + k * 0.7) * (1 + k * 0.06));
                ctx.drawImage(upper.canvas, 0, src, W, 1, wob, y, W, 1);
            }
            ctx.globalAlpha = 1;
            // Dark ripple lines over the reflection.
            ctx.fillStyle = 'rgba(2,3,10,0.55)';
            for (let i = 0; i < 26; i++) {
                const y = shore + 2 + Math.floor(hash(i, 1) * (H - shore - 2));
                const x = Math.round((hash(i, 2) * W + t * (3 + hash(i, 3) * 4)) % (W + 30)) - 15;
                ctx.fillRect(x, y, 6 + Math.floor(hash(i, 4) * 14), 1);
            }
            ctx.fillStyle = css(hex('#ffd27a'), 0.25);
            ctx.fillRect(0, shore, W, 1);

            // Little boats rocking, with a lantern that brightens on the beat.
            for (const bt of boats) {
                const dy = Math.round(Math.sin(t * 1.3 + bt.ph));
                ctx.fillStyle = '#05060d';
                ctx.fillRect(bt.x - 6, bt.y + dy, 13, 2);
                ctx.fillRect(bt.x - 4, bt.y + dy + 2, 9, 1);
                ctx.fillRect(bt.x, bt.y + dy - 9, 1, 9);
                ctx.fillStyle = css(hex('#ffcf7a'), 0.7 + 0.3 * b);
                ctx.fillRect(bt.x + 1, bt.y + dy - 4, 1, 1);
                ctx.fillStyle = css(hex('#ffcf7a'), 0.2);
                ctx.fillRect(bt.x + 1, bt.y + dy + 3, 1, 3);
            }
        };
    }
};
