import {Backdrop, bayer, css, disc, ditherPick, hex, pixels, pulse, rng} from '../pixel';
import {glowSprite} from './fx';

/**
 * The savanna at golden hour: a huge low sun in an amber haze, a lone
 * flat-topped acacia, giraffes ambling past in silhouette, a flock of birds
 * crossing and tall grass rippling in the wind. The sun's glow breathes on
 * the beat.
 */
export const SAVANNA: Backdrop = {
    id: 'world-savanna',
    name: 'Savanna',
    bpm: 108,
    create(W, H) {
        const random = rng(64);
        const horizon = Math.round(H * 0.72);
        const sky = ['#a04a26', '#c0602c', '#d87a32', '#e8963a', '#f2b04a', '#f8c862'].map(hex);
        const R = Math.round(H * 0.22);
        const sunX = Math.round(W * 0.42), sunY = horizon - Math.round(R * 0.55);
        const ink = hex('#2a1208');

        const back = pixels(W, H, put => {
            for (let y = 0; y < horizon; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, Math.pow(y / horizon, 0.9), x, y));
            const sunCols = ['#fff8d8', '#ffeaa8', '#ffd878'].map(hex);
            disc(put, sunX, sunY, R, (x, y) => ditherPick(sunCols, Math.hypot(x - sunX, y - sunY) / R, x, y));
            // Bands of haze across the sun.
            const haze = hex('#f0a850');
            for (const [hy, th] of [[sunY - 6, 2], [sunY + 6, 1], [sunY + 14, 2]])
                for (let y = hy; y < hy + th; y++)
                    for (let x = sunX - R; x <= sunX + R; x++) if (bayer(x, y) < 0.7) put(x, y, haze);
            // Distant flat land with low hills and tiny trees, pale with haze.
            const far = hex('#b8643a'), farDark = hex('#9a5232');
            for (let x = 0; x < W; x++) {
                const hill = Math.round(Math.max(0, Math.sin(x * 0.012 + 1) * 6 + Math.sin(x * 0.031) * 3));
                for (let y = horizon - 2 - hill; y < horizon; y++) put(x, y, far);
            }
            for (let i = 0; i < Math.round(W / 40); i++) {
                const tx = Math.round(random() * W), ty = horizon - 3;
                const w = 4 + Math.round(random() * 4);
                for (let x = -w; x <= w; x++) put(tx + x, ty - 4, farDark);
                for (let x = -w + 1; x < w; x++) put(tx + x, ty - 5, farDark);
                for (let y = ty - 3; y <= ty; y++) put(tx, y, farDark);
            }
            for (let y = horizon; y < H; y++)
                for (let x = 0; x < W; x++)
                    put(x, y, ditherPick([hex('#7a3a1c'), hex('#5a2812'), hex('#3a180a')], (y - horizon) / (H - horizon), x, y));
        });

        // The acacia: a short forked trunk under a wide flat crown, lit on top.
        const treeX = Math.round(W * 0.74);
        const acacia = pixels(W, H, put => {
            const base = horizon + 8;
            const crownY = base - 54;
            const branch = (x0: number, y0: number, x1: number, y1: number, w: number) => {
                const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
                for (let i = 0; i <= n; i++) {
                    const u = i / n, ww = Math.max(1, Math.round(w * (1 - u * 0.6)));
                    for (let k = 0; k < ww; k++) put(x0 + (x1 - x0) * u + k - ww / 2, y0 + (y1 - y0) * u, ink);
                }
            };
            branch(treeX, base, treeX - 2, base - 26, 4);
            branch(treeX - 2, base - 26, treeX - 26, crownY + 4, 3);
            branch(treeX - 2, base - 26, treeX + 4, crownY + 2, 3);
            branch(treeX - 1, base - 30, treeX + 26, crownY + 5, 2);
            branch(treeX - 12, crownY + 12, treeX - 36, crownY + 6, 2);
            branch(treeX + 14, crownY + 10, treeX + 38, crownY + 7, 2);
            const lit = hex('#7a3418');
            for (let i = 0; i < 14; i++) {
                const cx = treeX - 40 + (i / 13) * 80 + (random() - 0.5) * 6;
                const cy = crownY + (random() - 0.5) * 4 - Math.sin((i / 13) * Math.PI) * 4;
                const rx = 9 + random() * 7, ry = 3 + random() * 2;
                for (let y = -ry; y <= ry; y++)
                    for (let x = -rx; x <= rx; x++) {
                        const d = (x / rx) ** 2 + (y / ry) ** 2;
                        if (d > 1 - bayer(Math.round(cx + x), Math.round(cy + y)) * 0.3) continue;
                        put(cx + x, cy + y, y < -ry * 0.5 && x < 0 ? lit : ink);
                    }
            }
        });

        const glow = glowSprite(R * 2, hex('#ffd890'), 1.4);

        const giraffes = [
            {x0: 0, scale: 1, speed: 3.2, phase: 0},
            {x0: 34, scale: 0.8, speed: 3.2, phase: 1.4},
            {x0: 180, scale: 0.9, speed: 2.6, phase: 2.6}
        ];
        const birds = Array.from({length: 9}, (_, i) => ({
            dx: i * 7 - Math.abs(i - 4) * 2, dy: Math.abs(i - 4) * 3 + (random() - 0.5) * 2, flap: random() * 6
        }));
        const blades = Array.from({length: Math.round(W / 1.5)}, () => ({
            x: Math.floor(random() * W), h: 4 + Math.floor(random() * 12), seed: random() * 6,
            c: random() < 0.3 ? '#4a200e' : '#200c04'
        }));
        const motes = Array.from({length: 26}, () => ({x: random() * W, y: random() * horizon, s: random() * 10}));

        // A giraffe walking left, feet at (x, ground), drawn from rects.
        const giraffe = (ctx: CanvasRenderingContext2D, x: number, ground: number, s: number, phase: number) => {
            const P = (v: number) => Math.round(v * s);
            const rect = (dx: number, dy: number, w: number, h: number) =>
                ctx.fillRect(x + P(dx), ground - P(dy), Math.max(1, P(w)), Math.max(1, P(h)));
            const legLen = 18;
            const bob = Math.round(Math.sin(phase * 2) * 0.6);
            // Legs: same-side legs move together (a pace).
            for (const [lx, side] of [[1, 0], [3, 1], [11, 0], [13, 1]]) {
                const swing = Math.sin(phase + side * Math.PI) * 2.5;
                for (let k = 0; k < legLen; k += 2) {
                    const u = k / legLen;
                    rect(lx + swing * (1 - u) * (1 - u), legLen - k, 1.4, 2.4);
                }
            }
            ctx.fillStyle = '#2a1208';
            // Body slopes down from shoulders to rump.
            for (let i = 0; i < 15; i++) rect(i, legLen + 7 + bob - i * 0.25, 1, 7 - i * 0.1);
            // Neck up and forward, head, ossicones.
            const nod = Math.sin(phase * 2) * 0.8;
            for (let k = 0; k < 18; k++) rect(-k * 0.45 + 1 + nod * k / 18, legLen + 7 + k, 2.6 - k * 0.04, 2);
            const hx = -8 + nod, hy = legLen + 25;
            rect(hx - 3, hy + 1, 5, 2.4);
            rect(hx - 4, hy, 3, 1.6);
            rect(hx, hy + 3, 1, 2);
            rect(hx + 1.5, hy + 3, 1, 2);
            // Tail.
            rect(15, legLen + 4 + Math.sin(phase) * 0.5, 1, 4);
        };

        return (ctx, t, beat) => {
            const kick = pulse(beat);
            ctx.drawImage(back.canvas, 0, 0);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.18 + 0.12 * kick;
            ctx.drawImage(glow, sunX - R * 2, sunY - R * 2);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';

            // Birds crossing high up in a loose V.
            const fx = ((t * 7) % (W + 120)) - 60;
            const fy = 28 + Math.sin(t * 0.2) * 6;
            ctx.fillStyle = '#4a1e0c';
            for (const b of birds) {
                const x = Math.round(W - fx - b.dx), y = Math.round(fy + b.dy + Math.sin(t + b.dx) * 1);
                const up = Math.sin(t * 9 + b.flap) > 0;
                ctx.fillRect(x, y, 1, 1);
                ctx.fillRect(x - 1, y + (up ? -1 : 0), 1, 1);
                ctx.fillRect(x + 1, y + (up ? -1 : 0), 1, 1);
                ctx.fillRect(x - 2, y + (up ? -2 : 1), 1, 1);
                ctx.fillRect(x + 2, y + (up ? -2 : 1), 1, 1);
            }

            // Dust motes drifting in the light.
            for (const m of motes) {
                const x = Math.round((m.x + t * 3) % W), y = Math.round(m.y + Math.sin(t * 0.5 + m.s) * 6);
                ctx.fillStyle = css(hex('#fff0b0'), 0.25 + 0.25 * Math.sin(t * 1.3 + m.s));
                ctx.fillRect(x, y, 1, 1);
            }

            ctx.drawImage(acacia.canvas, 0, 0);

            ctx.fillStyle = '#2a1208';
            const span = W + 220;
            for (const g of giraffes) {
                const x = Math.round(W + 40 - ((g.x0 + t * g.speed) % span));
                giraffe(ctx, x, horizon + 10 - Math.round((1 - g.scale) * 6), g.scale, t * 2.2 + g.phase);
            }

            // Tall grass along the bottom, rippling in waves of wind.
            const groundTop = H - 16;
            ctx.fillStyle = '#200c04';
            ctx.fillRect(0, groundTop, W, H - groundTop);
            for (const b of blades) {
                const wind = Math.sin(t * 1.4 - b.x * 0.04) * 0.5 + 0.5;
                const lean = wind * 3 + Math.sin(t * 3 + b.seed) * 0.5;
                ctx.fillStyle = b.c;
                for (let k = 0; k < b.h; k += 2) {
                    const u = k / b.h;
                    ctx.fillRect(Math.round(b.x + lean * u * u), groundTop - k, 1, 2);
                }
            }
        };
    }
};
