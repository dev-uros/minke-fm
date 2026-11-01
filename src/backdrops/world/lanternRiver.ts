import {Backdrop, css, ditherPick, hash, hex, pixels, pulse, rng} from '../pixel';
import {glowSprite} from './fx';

/**
 * A festival night on a wide river: paper lanterns float downstream with
 * their reflections trembling beneath them, sky lanterns rise slowly from the
 * far bank past tiered rooftops and palms, and every flame breathes on the beat.
 */
export const LANTERN_RIVER: Backdrop = {
    id: 'world-lantern-river',
    name: 'Lantern festival',
    bpm: 72,
    create(W, H) {
        const random = rng(88);
        const bank = Math.round(H * 0.5);
        const water = bank + 4;
        const sky = ['#02040e', '#050a1c', '#0a1430', '#122040', '#1e2a48', '#3a3048'].map(hex);
        const river = ['#1a1c34', '#10162a', '#0a1020', '#060a16', '#04060e'].map(hex);

        const back = pixels(W, H, put => {
            for (let y = 0; y < water; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, y / bank, x, y));
            for (let i = 0; i < 70; i++) put(random() * W, random() * bank * 0.55, hex('#c8d0f0'), 50 + random() * 120);
            for (let y = water; y < H; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(river, Math.pow((y - water) / (H - water), 0.8), x, y));
        });

        // The far bank: tiered roofs, a dome, palms and trees, a few warm windows.
        const town = pixels(W, H, put => {
            const dark = hex('#05060c');
            const fill = (x0: number, y0: number, x1: number, y1: number) => {
                for (let y = Math.round(y0); y < y1; y++)
                    for (let x = Math.round(x0); x < x1; x++) put(x, y, dark);
            };
            fill(0, bank - 3, W, water);
            for (let x = 0; x < W; x++) {
                const h = 3 + Math.round(Math.abs(Math.sin(x * 0.11) + Math.sin(x * 0.037)) * 4);
                fill(x, bank - h, x + 1, bank);
            }
            let x = -10;
            while (x < W) {
                const kind = random();
                if (kind < 0.35) {
                    // Pagoda-like tiers.
                    const w = 16 + Math.round(random() * 8), tiers = 2 + Math.floor(random() * 3);
                    let y = bank - 6, tw = w;
                    for (let i = 0; i < tiers; i++) {
                        fill(x + (w - tw) / 2 + 2, y - 5, x + (w + tw) / 2 - 2, y);
                        fill(x + (w - tw) / 2 - 1, y - 7, x + (w + tw) / 2 + 1, y - 5);
                        fill(x + (w - tw) / 2 - 2, y - 6, x + (w - tw) / 2, y - 5);
                        y -= 7;
                        tw -= 4;
                    }
                    fill(x + w / 2, y - 5, x + w / 2 + 1, y);
                    x += w + 4;
                } else if (kind < 0.5) {
                    // A dome on a drum.
                    const r = 5 + Math.round(random() * 3);
                    fill(x, bank - 10, x + 2 * r + 2, bank);
                    for (let dy = 0; dy <= r; dy++) {
                        const half = Math.round(Math.sqrt(r * r - dy * dy));
                        fill(x + r + 1 - half, bank - 10 - dy, x + r + 2 + half, bank - 9 - dy);
                    }
                    fill(x + r + 1, bank - 13 - r, x + r + 2, bank - 10 - r);
                    x += 2 * r + 6;
                } else if (kind < 0.75) {
                    // Palm.
                    const h = 14 + Math.round(random() * 10);
                    for (let i = 0; i < h; i++) put(x + Math.round(i * i * 0.01), bank - i, dark);
                    const tx = x + Math.round(h * h * 0.01), ty = bank - h;
                    for (const a of [-2.8, -2.2, -1.4, -0.8, -0.2]) {
                        for (let s = 1; s < 8; s++) put(tx + Math.cos(a) * s, ty + Math.sin(a) * s + s * s * 0.06, dark);
                    }
                    x += 8 + Math.round(random() * 6);
                } else {
                    // Low house with a flat roof.
                    const w = 10 + Math.round(random() * 10), h = 8 + Math.round(random() * 6);
                    fill(x, bank - h, x + w, bank);
                    x += w + 2;
                }
            }
        });
        const windows = Array.from({length: Math.round(W / 14)}, () => ({
            x: Math.floor(random() * W), y: bank - 3 - Math.floor(random() * 8), seed: random() * 99
        }));

        const glowBig = glowSprite(12, hex('#ff9a40'));
        const glowSmall = glowSprite(6, hex('#ffa850'));

        // Floating lanterns, each at its own distance from us.
        const floats = Array.from({length: Math.round(W / 11)}, () => {
            const d = Math.pow(random(), 0.8);
            return {d, x0: random() * (W + 40), speed: 1.5 + d * 4 + random(), seed: random() * 100};
        }).sort((a, b) => a.d - b.d);

        const flyers = Array.from({length: Math.round(W / 14)}, () => ({
            x0: random() * W, seed: random(), period: 40 + random() * 30, sway: 4 + random() * 8
        }));

        return (ctx, t, beat) => {
            const breath = 0.75 + 0.25 * pulse(beat);
            ctx.drawImage(back.canvas, 0, 0);

            // Sky lanterns: rise from the bank and shrink into the distance.
            ctx.globalCompositeOperation = 'lighter';
            for (const f of flyers) {
                const u = ((t / f.period) + f.seed) % 1;
                const y = Math.round(bank - 6 - u * (bank + 10));
                const x = Math.round(f.x0 + Math.sin(t * 0.3 + f.seed * 9) * f.sway + u * 20);
                const fade = Math.min(1, u * 8) * (1 - u * 0.7);
                ctx.globalAlpha = 0.6 * fade * breath;
                ctx.drawImage(u < 0.4 ? glowBig : glowSmall, x - (u < 0.4 ? 12 : 6), y - (u < 0.4 ? 12 : 6));
                ctx.globalAlpha = fade;
                const size = u < 0.35 ? 2 : 1;
                ctx.fillStyle = '#ffb060';
                ctx.fillRect(x - 1, y - size, size + 1, size * 2);
                ctx.fillStyle = '#fff0c0';
                ctx.fillRect(x, y, 1, 1);
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';

            ctx.drawImage(town.canvas, 0, 0);
            for (const w of windows) {
                if (hash(w.seed, Math.floor(t / 7 + w.seed)) < 0.15) continue;
                ctx.fillStyle = '#e8a050';
                ctx.fillRect(w.x, w.y, 1, 1);
                // Its reflection, stretched in the water.
                for (let k = 0; k < 4; k++) {
                    if (hash(w.x + k, Math.floor(t * 4)) < 0.5) continue;
                    ctx.fillStyle = css(hex('#e8a050'), 0.35 - k * 0.07);
                    ctx.fillRect(w.x - 1 + Math.round(Math.sin(t * 2 + k) * 1), water + 1 + k * 2, 2, 1);
                }
            }

            // Ripples on the water, drifting slowly.
            const slot = Math.floor(t * 2);
            for (let y = water + 2; y < H; y += 2) {
                const d = (y - water) / (H - water);
                ctx.fillStyle = css(hex('#4a5a8a'), 0.12 + d * 0.15);
                for (let i = 0; i < 3; i++) {
                    const x = Math.round(hash(y, i + slot * 3) * W + t * (2 + d * 6)) % W;
                    ctx.fillRect(x, y, 3 + Math.round(d * 8), 1);
                }
            }

            for (const f of floats) {
                const y = Math.round(water + 4 + f.d * (H - water - 10));
                const x = Math.round(((f.x0 + t * f.speed) % (W + 40)) - 20);
                const size = 1 + Math.round(f.d * 3);
                const flick = breath * (0.85 + 0.15 * Math.sin(t * 6 + f.seed));
                // Reflection first: a broken orange streak below the lantern.
                for (let k = 1; k < 4 + size * 3; k++) {
                    if (hash(f.seed + k, Math.floor(t * 5)) < 0.3) continue;
                    ctx.fillStyle = css(hex('#ff9a40'), (0.5 - k * 0.04) * flick);
                    const wob = Math.round(Math.sin(t * 3 + k * 0.9 + f.seed) * (k * 0.15));
                    ctx.fillRect(x + wob - Math.floor(size / 2), y + size + k, size + 1, 1);
                }
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = (0.35 + f.d * 0.35) * flick;
                if (size >= 3) ctx.drawImage(glowBig, x - 12, y - 12);
                else ctx.drawImage(glowSmall, x - 6, y - 6);
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
                // Lantern: a dark float with a glowing paper box on it.
                ctx.fillStyle = '#1a1018';
                ctx.fillRect(x - size, y + size, size * 2 + 2, 1);
                ctx.fillStyle = '#ff9440';
                ctx.fillRect(x - Math.floor(size / 2), y - size + 1, size + 1, size * 2 - 1);
                ctx.fillStyle = '#ffe2a0';
                ctx.fillRect(x, y - Math.floor(size / 2), 1, Math.max(1, size - 1));
            }
        };
    }
};
