import {Backdrop, bayer, canvas, css, disc, ditherPick, hex, pixels, pulse, RGB, rng, wrappingNoise} from '../pixel';

/**
 * A pine forest at dawn: four ranks of trees fade into a pale peach sky, banks
 * of mist drift sideways between them, the low sun glows on the beat, and now
 * and then a bird flaps slowly across.
 */
export const MISTY_PINES: Backdrop = {
    id: 'ambient-misty-pines',
    name: 'Misty pines',
    bpm: 62,
    create(W, H) {
        const random = rng(19);
        const sky = ['#f6d6b8', '#e9c3ae', '#cdb1ad', '#a8a3b4', '#7f8aa6'].map(hex).reverse();
        const sun = {x: Math.round(W * 0.56), y: Math.round(H * 0.42)};

        const back = pixels(W, H, put => {
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, Math.min(1, y / (H * 0.6)), x, y));
            disc(put, sun.x, sun.y, 9, () => hex('#fff1d8'));
        });

        // Each rank of pines is its own layer, so mist can sit between them.
        const ranks: Array<{c: HTMLCanvasElement; mist: RGB}> = [];
        const tones = ['#b6a7ad', '#8a8296', '#5a5670', '#2a2a3c'];
        tones.forEach((tone, d) => {
            const base = Math.round(H * [0.6, 0.7, 0.83, 1.02][d]);
            const scale = [0.5, 0.75, 1.1, 1.8][d];
            const strip = canvas(W, H);
            const g = strip.ctx;
            g.fillStyle = tone;
            g.fillRect(0, base, W, H - base);
            let x = -4;
            while (x < W + 4) {
                const h = Math.round((18 + random() * 22) * scale);
                const half = Math.max(2, Math.round(h * 0.22));
                for (let k = 0; k < h; k++) {
                    // Tiered branches: width grows down the tree with notches.
                    const tier = (k % Math.max(3, Math.round(5 * scale))) / Math.max(3, Math.round(5 * scale));
                    const w = Math.max(0, Math.round((k / h) * half * (0.7 + 0.3 * tier)));
                    for (const off of [0, W, -W]) g.fillRect(x + off - w, base - h + k, w * 2 + 1, 1);
                }
                for (const off of [0, W, -W]) g.fillRect(x + off, base - 2, 1, 3);
                x += Math.round((3 + random() * 6) * scale);
            }
            ranks.push({c: strip.canvas, mist: hex(['#f4e2d4', '#dccfd0', '#c2bccb', '#a9a8bd'][d])});
        });

        // Mist banks: dithered noise layers that slide sideways.
        const mists = [0, 1, 2, 3].map(d => {
            const n = wrappingNoise(W, 40, 22, random);
            const band = Math.round(H * [0.6, 0.7, 0.83, 0.97][d]) - 6;
            const colour = ranks[d].mist;
            return {
                speed: 1.5 + d * 1.2,
                layer: pixels(W, H, put => {
                    for (let y = band - 22; y < band + 22; y++) {
                        const fade = 1 - Math.abs(y - band) / 22;
                        for (let x = 0; x < W; x++) {
                            const v = n(x, y - band + 20) * fade;
                            if (v > 0.12 + bayer(x, y) * 0.45) put(x, y, colour, 255);
                        }
                    }
                })
            };
        });

        const bird = {start: 3, period: 28};

        return (ctx, t, beat) => {
            ctx.drawImage(back.canvas, 0, 0);

            // Sun halo breathes on the beat.
            const glow = ctx.createRadialGradient(sun.x, sun.y, 4, sun.x, sun.y, H * 0.5);
            glow.addColorStop(0, `rgba(255,236,200,${(0.35 + 0.15 * pulse(beat)).toFixed(3)})`);
            glow.addColorStop(1, 'rgba(255,236,200,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, W, H);

            // A bird crosses high up every so often.
            const phase = (t + bird.start) % bird.period;
            if (phase < 18) {
                const bx = Math.round(-10 + (phase / 18) * (W + 20));
                const by = Math.round(H * 0.25 + Math.sin(phase * 0.6) * 4);
                const flap = Math.sin(t * 7) > 0 ? -1 : 1;
                ctx.fillStyle = '#4a4458';
                ctx.fillRect(bx, by, 1, 1);
                ctx.fillRect(bx - 1, by + flap, 1, 1);
                ctx.fillRect(bx + 1, by + flap, 1, 1);
                ctx.fillRect(bx - 2, by + flap * 2, 1, 1);
                ctx.fillRect(bx + 2, by + flap * 2, 1, 1);
            }

            // Each rank of trees, then the mist that hangs in front of it.
            ranks.forEach((r, d) => {
                ctx.drawImage(r.c, 0, 0);
                const m = mists[d];
                const off = Math.floor(t * m.speed) % W;
                ctx.globalAlpha = d === 3 ? 0.35 : 0.7;
                ctx.drawImage(m.layer.canvas, -off, 0);
                ctx.drawImage(m.layer.canvas, W - off, 0);
                ctx.globalAlpha = 1;
            });

            ctx.fillStyle = css(hex('#f6d6b8'), 0.04);
            ctx.fillRect(0, 0, W, H);
        };
    }
};
