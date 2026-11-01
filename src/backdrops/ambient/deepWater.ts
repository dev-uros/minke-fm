import {Backdrop, bayer, css, ditherPick, hex, pixels, pulse, rng} from '../pixel';

/**
 * Under the sea: shafts of light slant down from a shimmering surface, specks
 * drift through the blue, kelp sways on a rocky floor, and two jellyfish rise
 * slowly, their bells contracting on the beat.
 */
export const DEEP_WATER: Backdrop = {
    id: 'ambient-deep-water',
    name: 'Deep water',
    bpm: 54,
    create(W, H) {
        const random = rng(43);
        const water = ['#1d6f86', '#155a73', '#0f4560', '#0a3249', '#061f33', '#03111f'].map(hex);

        const back = pixels(W, H, put => {
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(water, Math.pow(y / H, 0.8), x, y));
        });

        // Sea floor: dark rocks and sand, with kelp drawn per frame.
        const floorY = Math.round(H * 0.86);
        const floor = pixels(W, H, put => {
            const sand = ['#05121c', '#0b2230', '#173647'].map(hex);
            for (let x = 0; x < W; x++) {
                const top = floorY + Math.round(Math.sin(x * 0.05) * 3 + Math.sin(x * 0.17) * 1.5);
                for (let y = top; y < H; y++) put(x, y, ditherPick(sand, 1 - (y - top) / 14 - 0.2, x, y));
            }
            for (let i = 0; i < 9; i++) {
                const cx = random() * W, r = 4 + random() * 9;
                const cy = floorY + 2;
                for (let y = -r; y <= 0; y++)
                    for (let x = -r * 1.4; x <= r * 1.4; x++)
                        if ((x / 1.4) ** 2 + y * y <= r * r)
                            put(cx + x, cy + y, ditherPick(['#03080e', '#0a1a26', '#14303f'].map(hex), (-y / r) * 0.4 + (x < 0 ? 0.3 : 0), cx + x, cy + y));
            }
        });

        const kelp = Array.from({length: Math.round(W / 22)}, (_, i) => ({
            x: Math.round((i + 0.3 + random() * 0.5) * 22),
            h: 30 + random() * 60,
            phase: random() * 6
        }));

        const motes = Array.from({length: 90}, () => ({
            x: random() * W, y: random() * H, speed: 0.6 + random() * 2.2, size: random() < 0.15 ? 2 : 1,
            a: 0.15 + random() * 0.4
        }));

        const jellies = [
            {x: 0.56, depth: 0.55, size: 13, period: 60, phase: 0},
            {x: 0.32, depth: 0.1, size: 8, period: 80, phase: 2.5}
        ];
        const bell = hex('#e6a6ff'), rim = hex('#ffd6ff'), glowC = hex('#ff8fe6');

        const ray = hex('#bff6ff');

        // A loose school of small fish that crosses now and then, far off.
        const school = Array.from({length: 14}, () => ({dx: random() * 40, dy: random() * 16, phase: random() * 6}));

        return (ctx, t, beat) => {
            const beatPulse = pulse(beat);
            ctx.drawImage(back.canvas, 0, 0);

            // Light shafts: slanted bands that sway and fade with depth.
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 6; i++) {
                const cx = W * (0.1 + i * 0.17) + Math.sin(t * 0.13 + i * 1.7) * 18;
                const width = 6 + (i % 3) * 5 + Math.sin(t * 0.3 + i) * 2;
                const strength = 0.06 + 0.04 * Math.sin(t * 0.4 + i * 2.3);
                for (let y = 0; y < H * 0.85; y += 3) {
                    const rel = y / (H * 0.85);
                    const x = Math.round(cx + y * 0.35 - width / 2 - rel * width * 0.5);
                    ctx.fillStyle = css(ray, strength * (1 - rel));
                    ctx.fillRect(x, y, Math.round(width * (1 + rel)), 3);
                }
            }
            ctx.globalCompositeOperation = 'source-over';

            // The surface: a band of shifting caustic dashes.
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < W; x += 3) {
                    const v = Math.sin(x * 0.12 + t * 1.1 + y * 0.9) + Math.sin(x * 0.05 - t * 0.7 + y * 1.7);
                    if (v > 1.0 - y * 0.12 + bayer(x, y) * 0.4) {
                        ctx.fillStyle = css(ray, 0.5 - y * 0.055);
                        ctx.fillRect(x, y, 3, 1);
                    }
                }
            }

            // Drifting specks.
            for (const m of motes) {
                const y = (((m.y - t * m.speed) % H) + H) % H;
                const x = Math.round(m.x + Math.sin(t * 0.4 + m.y) * 3);
                ctx.fillStyle = css(ray, m.a * (1 - y / H * 0.6));
                ctx.fillRect(x, Math.round(y), m.size, m.size);
            }

            const schoolT = (t % 50) / 50;
            const sx = W + 30 - schoolT * (W + 90);
            const sy = H * 0.5 + Math.sin(t * 0.2) * 8;
            ctx.fillStyle = '#05192a';
            for (const f of school) {
                const fx = Math.round(sx + f.dx + Math.sin(t * 0.8 + f.phase) * 2);
                const fy = Math.round(sy + f.dy + Math.sin(t * 0.6 + f.phase) * 1.5);
                ctx.fillRect(fx, fy, 3, 1);
                ctx.fillRect(fx + 3, fy - 1, 1, 3);
            }

            // Jellyfish rise slowly and wrap around.
            for (const j of jellies) {
                const travel = H + 80;
                const cy = Math.round(H + 20 - (((t / j.period + j.depth) % 1) * travel));
                const cx = Math.round(W * j.x + Math.sin(t * 0.2 + j.phase) * 14);
                const squeeze = pulse(beat + j.phase * 0.1);
                const rw = Math.round(j.size * (1 - 0.18 * squeeze));
                const rh = Math.round(j.size * 0.75 * (1 + 0.15 * squeeze));

                // Soft glow.
                const halo = ctx.createRadialGradient(cx, cy - rh / 2, 1, cx, cy - rh / 2, j.size * 2.4);
                halo.addColorStop(0, css(glowC, 0.18 + 0.12 * beatPulse));
                halo.addColorStop(1, css(glowC, 0));
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = halo;
                ctx.fillRect(cx - j.size * 3, cy - rh / 2 - j.size * 3, j.size * 6, j.size * 6);
                ctx.globalCompositeOperation = 'source-over';

                // Bell: a half-dome drawn row by row.
                for (let y = 0; y <= rh; y++) {
                    const half = Math.round(rw * Math.sqrt(1 - Math.pow((rh - y) / rh, 2)));
                    ctx.fillStyle = css(bell, 0.35 + 0.35 * (1 - y / rh));
                    ctx.fillRect(cx - half, cy - rh + y, half * 2 + 1, 1);
                }
                ctx.fillStyle = css(rim, 0.8);
                ctx.fillRect(cx - rw, cy, rw * 2 + 1, 1);
                ctx.fillStyle = css(rim, 0.5);
                ctx.fillRect(cx - Math.round(rw / 2), cy - rh + 2, Math.round(rw / 2), 1);

                // Tentacles trail and wave.
                const count = j.size > 10 ? 7 : 5;
                for (let k = 0; k < count; k++) {
                    const tx = cx - rw + 2 + Math.round((k / (count - 1)) * (rw * 2 - 4));
                    const len = j.size * 2.6 + (k % 2) * 6;
                    for (let s = 1; s < len; s++) {
                        const wob = Math.round(Math.sin(t * 1.6 - s * 0.35 + k) * (s / len) * 2.5);
                        ctx.fillStyle = css(bell, 0.55 * (1 - s / len));
                        ctx.fillRect(tx + wob, cy + s, 1, 1);
                    }
                }
            }

            // Kelp sways, more towards the tips, with leaves off alternate sides.
            for (const k of kelp) {
                for (let s = 0; s < k.h; s++) {
                    const sway = Math.sin(t * 0.6 + k.phase - s * 0.05) * (s / k.h) * 8;
                    const x = Math.round(k.x + sway);
                    const y = floorY + 3 - s;
                    ctx.fillStyle = '#0d2e26';
                    ctx.fillRect(x, y, 2, 1);
                    const leaf = s % 6;
                    if (s > 4 && leaf < 4) {
                        const dir = Math.floor(s / 6) % 2 ? 1 : -1;
                        const len = 4 - Math.abs(leaf - 1.5) * 1.2 + Math.round(Math.sin(t + s) * 0.6);
                        ctx.fillStyle = leaf === 1 ? '#2a6a4c' : '#174536';
                        ctx.fillRect(dir > 0 ? x + 2 : x - Math.round(len), y, Math.round(len), 1);
                    }
                }
            }

            ctx.drawImage(floor.canvas, 0, 0);
        };
    }
};
