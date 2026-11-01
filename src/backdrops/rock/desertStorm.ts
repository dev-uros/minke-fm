import {Backdrop, css, ditherPick, hash, hex, pixels, pulse, rng, wrappingNoise} from '../pixel';
import {line} from './draw';

/**
 * A lonely desert highway at night under a thunderstorm. Rain slants across
 * the road, clouds roll over the mesas, and lightning on the bar lights up the
 * whole valley for a heartbeat. Now and then a pair of headlights comes in
 * from the horizon.
 */
export const DESERT_STORM: Backdrop = {
    id: 'rock-desert-storm',
    name: 'Desert storm',
    bpm: 90,
    create(W, H) {
        const random = rng(73);
        const cx = Math.round(W / 2);
        const horizon = Math.round(H * 0.56);
        const roadHalf = (y: number) => ((y - horizon) / (H - horizon)) * W * 0.36 + 0.5;

        // Clouds wrap horizontally and scroll; a lit copy shows during a flash.
        const big = wrappingNoise(W, horizon, 34, random);
        const small = wrappingNoise(W, horizon, 11, random);
        const dark = ['#05060b', '#0a0c16', '#121626', '#1c2034', '#2e2840', '#4a3048', '#6a3a44'].map(hex);
        const bright = ['#1a1d33', '#3b4566', '#6a7398', '#a7b0d0', '#e2e6ff'].map(hex);
        const cloud = (x: number, y: number) => {
            const v = big(x, y) * 0.7 + small(x, y) * 0.3;
            return Math.min(1, Math.max(0, v * 1.2 - 0.25 + (y / horizon) * 0.35));
        };
        const sky = pixels(W, horizon, put => {
            for (let y = 0; y < horizon; y++)
                for (let x = 0; x < W; x++) {
                    // Darker cloud bellies, with a faint glow along the horizon.
                    const c = cloud(x, y);
                    const glow = Math.pow(Math.max(0, (y - horizon * 0.55) / (horizon * 0.45)), 1.5);
                    put(x, y, ditherPick(dark, c * 0.55 * (1 - glow * 0.4) + glow * 0.55, x, y));
                }
        });
        const skyLit = pixels(W, horizon, put => {
            for (let y = 0; y < horizon; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(bright, cloud(x, y) * 0.9 + 0.1, x, y));
        });

        // Mesas: flat-topped slabs with steep sides, two rows.
        const mesaRow = (seed: number, minH: number, maxH: number) => {
            const r = rng(seed);
            const mesas: Array<{c: number; top: number; h: number; slope: number}> = [];
            for (let x = -20; x < W + 20; x += 30 + r() * 60) {
                if (Math.abs(x - cx) < 18) continue;
                mesas.push({c: x, top: 6 + r() * 24, h: minH + r() * (maxH - minH), slope: 0.6 + r() * 0.8});
            }
            return (x: number) => {
                let best = 0;
                for (const m of mesas) {
                    const d = Math.abs(x - m.c) - m.top;
                    const v = d <= 0 ? m.h : m.h - d * m.slope * (1 + Math.sin(x * 0.7) * 0.1);
                    best = Math.max(best, v);
                }
                return Math.round(horizon - Math.max(0, best));
            };
        };
        const far = mesaRow(5, 6, 14);
        const near = mesaRow(9, 10, 24);

        const land = (litUp: boolean) => pixels(W, H, put => {
            const farC = hex(litUp ? '#5a5476' : '#121424');
            const nearC = hex(litUp ? '#4a3640' : '#0b0a12');
            const rim = hex(litUp ? '#b8a0a8' : '#1e1c2c');
            const ground = (litUp ? ['#2a1e22', '#4a3434', '#6a4a40'] : ['#07060a', '#0d0a0e', '#151012']).map(hex);
            const asphalt = (litUp ? ['#2a2a36', '#4a4c60', '#6a6e88'] : ['#0b0b10', '#121218', '#1a1a22']).map(hex);
            const paint = hex(litUp ? '#f0e0a0' : '#6a5a3a');
            for (let x = 0; x < W; x++) {
                const tf = far(x), tn = near(x);
                for (let y = tf; y < horizon; y++) put(x, y, y === tf ? rim : farC);
                for (let y = tn; y < horizon; y++) put(x, y, y === tn && litUp ? rim : nearC);
            }
            for (let y = horizon; y < H; y++) {
                const f = (y - horizon) / (H - horizon);
                const hw = roadHalf(y);
                for (let x = 0; x < W; x++) {
                    const d = Math.abs(x - cx);
                    if (d < hw) {
                        const edge = d > hw - 1 - f * 1.5 && d < hw - f * 0.5;
                        // Centre dashes: spaced in depth, so they bunch up towards the horizon.
                        const z = 1 / Math.max(0.02, f);
                        const dash = d < 0.4 + f * 1.2 && (z % 2) < 1;
                        const sheen = litUp && Math.abs(x - cx - Math.sin(y * 0.5) * 2) < hw * 0.25;
                        put(x, y, edge || dash ? paint : ditherPick(asphalt, 0.35 + f * 0.3 + (sheen ? 0.35 : 0), x, y));
                    } else {
                        put(x, y, ditherPick(ground, 0.2 + f * 0.6, x, y));
                    }
                }
            }
        });
        const night = land(false);
        const flashLand = land(true);

        // Scrub, saguaros and telephone poles go on both copies.
        const props = (ctx: CanvasRenderingContext2D, litUp: boolean) => {
            const r = rng(91);
            ctx.fillStyle = litUp ? '#3a2e2a' : '#050407';
            for (let i = 0; i < 70; i++) {
                const y = horizon + 2 + Math.pow(r(), 1.6) * (H - horizon - 2);
                const x = r() * W;
                if (Math.abs(x - cx) < roadHalf(y) + 3) continue;
                const s = 1 + Math.round(((y - horizon) / (H - horizon)) * 3);
                ctx.fillRect(Math.round(x), Math.round(y) - s + 1, s + 1, s);
            }
            ctx.fillStyle = litUp ? '#2a3a2a' : '#040406';
            for (const [fx, base, h] of [[0.16, H - 22, 34], [0.86, horizon + 30, 18], [0.3, horizon + 12, 9]]) {
                const x = Math.round(fx * W), s = h / 34;
                ctx.fillRect(x - Math.round(2 * s), base - h, Math.max(1, Math.round(4 * s)), h);
                ctx.fillRect(x - Math.round(8 * s), base - Math.round(h * 0.55), Math.round(6 * s), Math.max(1, Math.round(2 * s)));
                ctx.fillRect(x - Math.round(8 * s), base - Math.round(h * 0.85), Math.max(1, Math.round(2 * s)), Math.round(h * 0.32));
                ctx.fillRect(x + Math.round(2 * s), base - Math.round(h * 0.4), Math.round(6 * s), Math.max(1, Math.round(2 * s)));
                ctx.fillRect(x + Math.round(6 * s), base - Math.round(h * 0.7), Math.max(1, Math.round(2 * s)), Math.round(h * 0.32));
            }
            // Poles along the right shoulder, receding, with sagging wire.
            ctx.fillStyle = litUp ? '#6a5a50' : '#020104';
            let prev: [number, number] | null = null;
            for (let z = 1; z < 14; z += 1.6) {
                const f = 1 / z;
                const y = Math.round(horizon + (H - horizon) * f);
                const x = Math.round(cx + roadHalf(y) * 1.45);
                const h = Math.round(115 * f) + 3;
                ctx.fillRect(x, y - h, Math.max(1, Math.round(2 * f)), h);
                ctx.fillRect(x - Math.round(5 * f) - 1, y - h + 1, Math.round(10 * f) + 3, 1);
                if (prev) {
                    for (let k = 0; k <= 30; k++) {
                        const q = k / 30;
                        ctx.fillRect(Math.round(prev[0] + (x - prev[0]) * q), Math.round(prev[1] + (y - h + 1 - prev[1]) * q + Math.sin(q * Math.PI) * 4 * f), 1, 1);
                    }
                }
                prev = [x, y - h + 1];
            }
        };
        props(night.ctx, false);
        props(flashLand.ctx, true);

        const drops = Array.from({length: Math.round(W * 0.6)}, () => ({
            x: random() * W, y: random() * H, speed: 170 + random() * 90, len: 3 + Math.floor(random() * 4)
        }));
        const rain = hex('#8a96c0');
        const boltColour = hex('#eef0ff');
        const spb = 60 / 90;
        let last = 0;

        return (ctx, t, beat) => {
            const dt = Math.min(0.1, Math.max(0, t - last));
            last = t;
            const k = pulse(beat);
            const scroll = Math.floor(t * 2) % W;

            // Lightning lands on the downbeat of some bars.
            const bar = Math.floor(beat / 4);
            const strike = hash(bar, 7) < 0.5;
            const s = (beat - bar * 4) * spb;
            let flash = 0;
            if (strike) {
                if (s < 0.07) flash = 1;
                else if (s < 0.13) flash = 0.25;
                else if (s < 0.22) flash = 0.85;
                else flash = Math.max(0, Math.exp(-(s - 0.22) * 6) * 0.7);
            } else if (hash(Math.floor(beat), 3) < 0.3) {
                flash = 0.12 * k;
            }

            ctx.drawImage(sky.canvas, -scroll, 0);
            ctx.drawImage(sky.canvas, W - scroll, 0);
            if (flash > 0.01) {
                ctx.globalAlpha = Math.min(1, flash * 0.85);
                ctx.drawImage(skyLit.canvas, -scroll, 0);
                ctx.drawImage(skyLit.canvas, W - scroll, 0);
                ctx.globalAlpha = 1;
            }

            // The bolt, a jagged random walk from the clouds to the ground.
            if (strike && s < 0.32) {
                const r = rng(bar * 31 + 1);
                let x = W * (0.12 + 0.76 * r()), y = 4 + r() * 10;
                const endY = horizon - 2 - r() * 6;
                ctx.globalCompositeOperation = 'lighter';
                const step = (fade: number) => css(boltColour, fade);
                while (y < endY) {
                    const nx = x + (r() - 0.5) * 8, ny = y + 2 + r() * 5;
                    ctx.fillStyle = step(0.25);
                    line(ctx, Math.round(x) + 1, Math.round(y), Math.round(nx) + 1, Math.round(ny));
                    ctx.fillStyle = step(1);
                    line(ctx, Math.round(x), Math.round(y), Math.round(nx), Math.round(ny));
                    if (r() < 0.18) {
                        let bx = nx, by = ny;
                        const dir = r() < 0.5 ? -1 : 1;
                        ctx.fillStyle = step(0.6);
                        for (let j = 0; j < 4; j++) {
                            const ex = bx + dir * (2 + r() * 5), ey = by + 2 + r() * 4;
                            line(ctx, Math.round(bx), Math.round(by), Math.round(ex), Math.round(ey));
                            bx = ex;
                            by = ey;
                        }
                        ctx.fillStyle = step(1);
                    }
                    x = nx;
                    y = ny;
                }
                ctx.globalCompositeOperation = 'source-over';
            }

            ctx.drawImage(night.canvas, 0, 0);
            if (flash > 0.01) {
                ctx.globalAlpha = Math.min(1, flash * 0.75);
                ctx.drawImage(flashLand.canvas, 0, 0);
                ctx.globalAlpha = 1;
            }

            // A car every half minute or so, headlights growing as it nears.
            const cycle = 31;
            const p = ((t + 8) % cycle) / 13;
            if (p < 1) {
                const y = horizon + (H - horizon) * Math.pow(p, 3);
                const hw = roadHalf(y);
                const x = cx - hw * 0.45;
                const sep = Math.max(1, hw * 0.28);
                const size = Math.max(1, Math.round(hw / 14));
                ctx.globalCompositeOperation = 'lighter';
                const glow = ctx.createRadialGradient(x, y, 0, x, y, 6 + hw * 0.8);
                glow.addColorStop(0, 'rgba(255,240,200,0.35)');
                glow.addColorStop(1, 'rgba(255,240,200,0)');
                ctx.fillStyle = glow;
                ctx.fillRect(x - 6 - hw, y - 6 - hw, 12 + hw * 2, 12 + hw * 2);
                ctx.fillStyle = 'rgba(255,248,220,0.95)';
                ctx.fillRect(Math.round(x - sep), Math.round(y) - size, size, size);
                ctx.fillRect(Math.round(x + sep), Math.round(y) - size, size, size);
                ctx.globalCompositeOperation = 'source-over';
            }

            // Cat's-eye reflectors along the edges breathe on the beat.
            ctx.fillStyle = css(hex('#ffb040'), 0.35 + 0.5 * k);
            for (let z = 1.5; z < 16; z += 1.8) {
                const y = Math.round(horizon + (H - horizon) / z);
                const hw = roadHalf(y);
                ctx.fillRect(Math.round(cx - hw), y, 1, 1);
                ctx.fillRect(Math.round(cx + hw) - 1, y, 1, 1);
            }

            ctx.fillStyle = css(rain, 0.3 + flash * 0.4);
            for (const d of drops) {
                d.y += d.speed * dt;
                d.x -= d.speed * dt * 0.3;
                if (d.y > H) {
                    d.y = -random() * 20;
                    d.x = random() * (W + 40);
                }
                if (d.x < 0) d.x += W + 20;
                for (let j = 0; j < d.len; j++) ctx.fillRect(Math.round(d.x + j * 0.3), Math.round(d.y - j), 1, 1);
            }

            if (flash > 0.01) {
                ctx.fillStyle = `rgba(220,225,255,${(flash * 0.1).toFixed(3)})`;
                ctx.fillRect(0, 0, W, H);
            }
        };
    }
};
