import {Backdrop, css, ditherPick, hex, pixels, pulse, RGB, rng} from '../pixel';

/**
 * Northern lights over snowy mountains: green-violet curtains ripple slowly
 * across a starry sky and a still lake mirrors them, broken only by a faint
 * ripple. The aurora brightens softly on the beat.
 */
export const AURORA_LAKE: Backdrop = {
    id: 'ambient-aurora-lake',
    name: 'Aurora lake',
    bpm: 60,
    create(W, H) {
        const random = rng(71);
        const shore = Math.round(H * 0.66);
        const sky = ['#02040c', '#050a1a', '#0a1328', '#11203a', '#183049'].map(hex);

        const back = pixels(W, shore, put => {
            for (let y = 0; y < shore; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, y / shore, x, y));
            for (let i = 0; i < W * 0.5; i++) {
                const y = random() * shore * 0.75;
                put(random() * W, y, hex('#dfe8ff'), 50 + random() * 170);
            }
        });

        // Mountains: overlapping triangular peaks, lit from the left, snow on top.
        const range = (seed: number, count: number, minH: number, maxH: number, slope: number) => {
            const r = rng(seed);
            const peaks = Array.from({length: count}, (_, i) => ({
                x: ((i + 0.2 + r() * 0.6) / count) * (W + 40) - 20,
                h: minH + r() * (maxH - minH),
                s: slope * (0.8 + r() * 0.5)
            }));
            return (x: number) => {
                let best = -1e9, side = 0, peak = 0;
                for (const p of peaks) {
                    const v = p.h - Math.abs(x - p.x) * p.s;
                    if (v > best) {
                        best = v;
                        side = x < p.x ? -1 : 1;
                        peak = p.h;
                    }
                }
                const rough = Math.sin(x * 0.7 + seed) * 0.8 + Math.sin(x * 1.9) * 0.5;
                return {top: Math.round(shore - best - rough), side, peak};
            };
        };
        const far = range(4, Math.max(4, Math.round(W / 70)), H * 0.16, H * 0.36, 0.75);
        const near = range(9, Math.max(5, Math.round(W / 50)), H * 0.06, H * 0.17, 0.6);
        const snowFar = ['#4a5c7a', '#7d90b0', '#b9c8e0', '#dfe8f6'].map(hex);
        const rockFar = ['#141c2c', '#1c2840'].map(hex);
        const snowNear = ['#2c3a52', '#56688a', '#8ea0c0'].map(hex);
        const rockNear = hex('#0b111d');
        const mountains = pixels(W, shore, put => {
            for (let x = 0; x < W; x++) {
                const f = far(x);
                for (let y = f.top; y < shore; y++) {
                    const fromPeak = y - (shore - f.peak);
                    const snowLine = f.peak * 0.45 + Math.sin(x * 0.45) * 3 + Math.sin(x * 1.3) * 2;
                    const lit = f.side < 0 ? 1 : 0.35;
                    if (fromPeak < snowLine) put(x, y, ditherPick(snowFar, lit - (fromPeak / snowLine) * 0.4, x, y));
                    else put(x, y, ditherPick(rockFar, f.side < 0 ? 0.6 : 0, x, y));
                }
                const n = near(x);
                for (let y = n.top; y < shore; y++) {
                    const fromPeak = y - (shore - n.peak);
                    const snowLine = n.peak * 0.35 + Math.sin(x * 0.8 + 1) * 2;
                    if (fromPeak < snowLine) put(x, y, ditherPick(snowNear, n.side < 0 ? 0.9 : 0.3, x, y));
                    else put(x, y, rockNear);
                }
            }
            // A dark line of pines along the shore.
            for (let x = 0; x < W; x += 2 + Math.floor(random() * 3)) {
                const h = 3 + Math.floor(random() * 6);
                for (let k = 0; k < h; k++) {
                    const half = Math.floor((k / h) * 2);
                    for (let dx = -half; dx <= half; dx++) put(x + dx, shore - h + k, hex('#050910'));
                }
            }
        });

        const green = hex('#3dffa0'), teal = hex('#2ad6c8'), violet = hex('#a35cff');
        const mix = (a: RGB, b: RGB, k: number): RGB =>
            [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k].map(Math.round) as RGB;

        const lakeH = H - shore;
        const reflect = Array.from({length: lakeH}, () => random() * 6.28);

        return (ctx, t, beat) => {
            const breath = 0.8 + 0.2 * pulse(beat);
            ctx.drawImage(back.canvas, 0, 0);

            // Aurora curtains, drawn in 2px columns with 'lighter' blending.
            ctx.globalCompositeOperation = 'lighter';
            for (let x = 0; x < W; x += 2) {
                const wave = Math.sin(x * 0.021 + t * 0.25) * 12 + Math.sin(x * 0.053 - t * 0.4) * 5;
                const base = Math.round(H * 0.36 + wave);
                const fold = Math.pow(0.5 + 0.5 * Math.sin(x * 0.09 + t * 0.7 + Math.sin(x * 0.013 + t * 0.15) * 4), 2);
                const band = 0.5 + 0.5 * Math.sin(x * 0.008 - t * 0.12);
                const rays = 0.75 + 0.25 * Math.sin(x * 0.9 + t * 0.5);
                const strength = (0.15 + 0.85 * fold) * (0.35 + 0.65 * band) * rays * breath;
                const len = 26 + Math.round(fold * 30);
                for (let k = 0; k < len; k += 3) {
                    const rel = k / len;
                    const colour = rel < 0.35 ? mix(green, teal, rel / 0.35) : mix(teal, violet, (rel - 0.35) / 0.65);
                    const alpha = strength * (rel < 0.1 ? 0.5 + rel * 5 : 1 - rel) * 0.7;
                    if (alpha < 0.02) continue;
                    ctx.fillStyle = css(colour, alpha);
                    ctx.fillRect(x, base - k - 3, 2, 3);
                }
                // A bright hem at the bottom of the curtain.
                ctx.fillStyle = css(green, strength * 0.8);
                ctx.fillRect(x, base, 2, 1);
            }
            ctx.globalCompositeOperation = 'source-over';

            ctx.drawImage(mountains.canvas, 0, 0);

            // The lake mirrors the sky row by row, each row nudged by a slow ripple.
            for (let i = 0; i < lakeH; i++) {
                const src = shore - 1 - Math.floor(i * 1.1);
                if (src < 0) break;
                const amp = 0.4 + i * 0.05;
                const dx = Math.round(Math.sin(t * 0.9 + i * 0.7 + reflect[i]) * amp);
                ctx.drawImage(ctx.canvas, 0, src, W, 1, dx, shore + i, W, 1);
            }
            // Darken the water and fade it towards the viewer.
            for (let i = 0; i < lakeH; i += 2) {
                ctx.fillStyle = `rgba(3,8,18,${(0.35 + 0.4 * (i / lakeH)).toFixed(3)})`;
                ctx.fillRect(0, shore + i, W, 2);
            }
            // Thin glints of still water.
            ctx.fillStyle = 'rgba(190,230,255,0.12)';
            for (let k = 0; k < 6; k++) {
                const y = shore + 3 + ((k * 7) % lakeH);
                const x = Math.round(((k * 53 + t * 2) % (W + 40)) - 20);
                ctx.fillRect(x, y, 10 + (k % 3) * 6, 1);
            }
            ctx.fillStyle = 'rgba(220,240,255,0.25)';
            ctx.fillRect(0, shore, W, 1);
        };
    }
};
