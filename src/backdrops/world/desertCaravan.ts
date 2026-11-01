import {Backdrop, bayer, css, disc, ditherPick, hash, hex, pixels, pulse, RGB, rng} from '../pixel';
import {glowSprite} from './fx';

/**
 * Dunes at blue hour, just after the sun has gone: a camel caravan walks
 * slowly along a ridge in silhouette, the lead camel carrying a lantern that
 * glows on the beat. Sand streams off the nearest crest, stars come out and a
 * thin crescent moon hangs over the desert.
 */
const CAMEL = [
    '..................#.',
    '................####',
    '................##..',
    '...###.........##...',
    '..#####.......##....',
    '.#######.....##.....',
    '.##########.##......',
    '#############.......',
    '#############.......',
    '.###########........',
    '..#########.........'
];
const LEGS = [{x: 2, side: 0}, {x: 4, side: 1}, {x: 9, side: 0}, {x: 11, side: 1}];

export const DESERT_CARAVAN: Backdrop = {
    id: 'world-desert-caravan',
    name: 'Desert caravan',
    bpm: 96,
    create(W, H) {
        const random = rng(57);
        const sky = ['#060a24', '#0c1838', '#18284e', '#2c3e6a', '#4e5884', '#86789a', '#c89490', '#eab08a'].map(hex);

        const dune = (base: number, amp: number, seed: number) => {
            const r = rng(seed);
            const k = [0.7 + r() * 0.3, 0.3 + r() * 0.2, 0.15 + r() * 0.1].map(f => (Math.PI * 2) / (W * f));
            const ph = [r() * 6, r() * 6, r() * 6];
            return (x: number) => base - amp * (0.6 * Math.sin(x * k[0] + ph[0]) +
                0.3 * Math.sin(x * k[1] + ph[1]) + 0.1 * Math.sin(x * k[2] + ph[2]));
        };
        const far = dune(H * 0.64, 5, 3);
        const mid = dune(H * 0.73, 8, 9);
        const near = dune(H * 0.88, 14, 21);
        const horizon = Math.round(H * 0.66);

        // A dune layer: faces turned towards the afterglow are lighter, the
        // rest in shadow, with a warm rim along the crest.
        const layer = (f: (x: number) => number, lit: RGB, shadow: RGB, rim: RGB, deep: RGB) =>
            (put: (x: number, y: number, c: RGB) => void) => {
                for (let x = 0; x < W; x++) {
                    const top = Math.round(f(x));
                    const slope = f(x + 1) - f(x - 1);
                    const light = Math.min(1, Math.max(0, 0.5 - slope * 1.2));
                    for (let y = top; y < H; y++) {
                        const down = Math.min(1, (y - top) / 46);
                        const face = ditherPick([shadow, lit], light * (1 - down * 0.6), x, y);
                        put(x, y, y === top ? rim : down > bayer(x, y) * 0.8 + 0.35 ? deep : face);
                    }
                }
            };

        const back = pixels(W, H, put => {
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, Math.pow(y / horizon, 1.1), x, y));
            for (let i = 0; i < 110; i++) {
                const y = random() * horizon * 0.65;
                put(random() * W, y, hex('#e0e4ff'));
            }
            // A thin crescent.
            const mx = Math.round(W * 0.66), my = 26;
            const moon = hex('#f2e8c8');
            disc(put, mx, my, 7, (x, y) => Math.hypot(x - mx - 3, y - my + 2) < 6.5 ? ditherPick(sky, y / horizon, x, y) : moon);
            layer(far, hex('#4a4876'), hex('#3a3866'), hex('#8a7c9c'), hex('#34325e'))(put);
        });
        const midLayer = pixels(W, H, layer(mid, hex('#3a3264'), hex('#28224a'), hex('#a8848e'), hex('#221c42')));
        const nearLayer = pixels(W, H, layer(near, hex('#2a2250'), hex('#1a1636'), hex('#c8928a'), hex('#14102a')));

        // Crests of the near dune, where the wind lifts sand.
        const crests: number[] = [];
        for (let x = 1; x < W - 1; x++) if (near(x) < near(x - 1) && near(x) <= near(x + 1)) crests.push(x);
        const grains = crests.flatMap(cx => Array.from({length: 18}, () => ({cx, seed: random(), spread: random()})));

        const glow = glowSprite(14, hex('#ffb060'));
        const twinkle = Array.from({length: 40}, () => ({x: Math.floor(random() * W), y: Math.floor(random() * horizon * 0.6), s: random() * 50}));

        const drawCamel = (ctx: CanvasRenderingContext2D, x: number, feet: number, phase: number, rider: boolean) => {
            const bob = Math.round(Math.abs(Math.sin(phase)) * 1);
            const top = feet - 7 - CAMEL.length - bob;
            ctx.fillStyle = '#07061a';
            CAMEL.forEach((row, ry) => {
                let run = -1;
                for (let rx = 0; rx <= row.length; rx++) {
                    const on = row[rx] === '#';
                    if (on && run < 0) run = rx;
                    if (!on && run >= 0) {
                        ctx.fillRect(x + run, top + ry, rx - run, 1);
                        run = -1;
                    }
                }
            });
            ctx.fillRect(x, top + 8, 1, 4);
            for (const leg of LEGS) {
                const swing = Math.sin(phase + leg.side * Math.PI) * 2;
                const knee = Math.round(swing * 0.5);
                ctx.fillRect(x + leg.x, top + CAMEL.length, 2, 3);
                ctx.fillRect(x + leg.x + knee, top + CAMEL.length + 3, 1, 2);
                ctx.fillRect(x + leg.x + Math.round(swing), feet - 2, 1, 2);
                ctx.fillRect(x + leg.x + Math.round(swing), feet - 1, 2, 1);
            }
            if (rider) {
                ctx.fillRect(x + 4, top - 7, 3, 3);
                ctx.fillRect(x + 3, top - 4, 4, 5);
                ctx.fillRect(x + 2, top - 1, 6, 2);
            }
            return top;
        };

        return (ctx, t, beat) => {
            const kick = pulse(beat);
            ctx.drawImage(back.canvas, 0, 0);
            for (const s of twinkle) {
                const a = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.8 + s.s));
                ctx.fillStyle = css(hex('#ffffff'), a);
                ctx.fillRect(s.x, s.y, 1, 1);
            }
            ctx.drawImage(midLayer.canvas, 0, 0);

            // The caravan: lead camel on the right, the rest roped behind.
            const span = W + 150;
            const lead = ((t * 4.5 + W * 0.55 + 30) % span) - 30;
            const tops: Array<{x: number; top: number}> = [];
            for (let i = 0; i < 5; i++) {
                const x = Math.round(lead - i * 25);
                if (x < -24 || x > W + 4) {
                    tops.push({x, top: 0});
                    continue;
                }
                const feet = Math.round(mid(x + 9)) + 1;
                const phase = t * 3.2 + i * 1.3;
                tops.push({x, top: drawCamel(ctx, x, feet, phase, i === 0 || i === 3)});
            }
            ctx.fillStyle = '#07061a';
            for (let i = 1; i < tops.length; i++) {
                const a = tops[i], b = tops[i - 1];
                if (a.top === 0 || b.top === 0) continue;
                const x0 = a.x + 19, y0 = a.top + 2, x1 = b.x, y1 = b.top + 8;
                for (let k = 0; k <= 6; k++) {
                    const u = k / 6;
                    ctx.fillRect(Math.round(x0 + (x1 - x0) * u), Math.round(y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * 2), 1, 1);
                }
            }
            // Lantern swinging from the lead camel's neck.
            const L = tops[0];
            if (L.top !== 0) {
                const lx = Math.round(L.x + 16 + Math.sin(t * 3.2) * 1), ly = L.top + 7;
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.5 + 0.4 * kick;
                ctx.drawImage(glow, lx - 14, ly - 13);
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = '#ffd890';
                ctx.fillRect(lx, ly, 2, 3);
                ctx.fillStyle = '#fff6d8';
                ctx.fillRect(lx, ly + 1, 1, 1);
            }

            ctx.drawImage(nearLayer.canvas, 0, 0);

            // Sand blown off the crests.
            for (const g of grains) {
                const u = (t * 0.35 + g.seed) % 1;
                const x = Math.round(g.cx + u * 34 + Math.sin(u * 9 + g.seed * 20) * 1.5);
                const y = Math.round(near(g.cx) - 2 - u * 5 - g.spread * 4 * u + u * u * 9);
                if (hash(g.seed * 100, Math.floor(t * 8)) < 0.2) continue;
                ctx.fillStyle = css(hex('#d8b0a4'), (1 - u) * 0.7);
                ctx.fillRect(x, y, 1, 1);
            }
        };
    }
};
