import {Backdrop, bayer, css, ditherPick, hash, hex, pixels, pulse, RGB, rng, wrappingNoise} from '../pixel';

/**
 * A volcanic hellscape: a black volcano under an ash-choked red sky, a lava
 * river winding out of the dark towards us between basalt spires, and embers
 * rising everywhere. The crater spits lava bombs on every downbeat and blows
 * properly every fourth bar.
 */
export const HELLSCAPE: Backdrop = {
    id: 'metal-hellscape',
    name: 'Hellscape',
    bpm: 96,
    create(W, H) {
        const random = rng(66);
        const cx = Math.round(W / 2);
        const horizon = Math.round(H * 0.6);
        const crater = {x: cx, y: Math.round(H * 0.27), half: 8};
        const baseHalf = Math.max(90, Math.round(W * 0.34));

        const skyPal = ['#060103', '#120305', '#240607', '#420b07', '#6e1a08', '#a33a0c'].map(hex);
        const ash = wrappingNoise(W, horizon, 26, random);
        const ashSmall = wrappingNoise(W, horizon, 8, random);
        const volcanoEdge = (x: number) => {
            const d = Math.abs(x - crater.x);
            if (d < crater.half) return crater.y + 2;
            const f = Math.min(1, (d - crater.half) / (baseHalf - crater.half));
            return Math.round(crater.y + Math.pow(f, 0.75) * (horizon - crater.y) + Math.sin(x * 0.9) * 0.8 + Math.sin(x * 0.23) * 1.5);
        };

        // Lava streams down the flanks: wandering paths from the crater lip.
        const streams: Array<Array<{x: number; y: number; s: number}>> = [];
        for (const dir of [-1, 1, -1]) {
            const path: Array<{x: number; y: number; s: number}> = [];
            let x = crater.x + dir * (crater.half - 2 - random() * 3);
            let s = 0;
            for (let y = crater.y + 2; y < horizon; y++) {
                const edgeX = x;
                x += dir * (0.15 + random() * 0.6) + (random() - 0.5) * 1.4;
                if (volcanoEdge(Math.round(x)) > y + 1) x = edgeX + dir * 0.2;
                path.push({x: Math.round(x), y, s: s++});
            }
            streams.push(path);
        }

        // Sky, ash clouds lit red from below, and the volcano.
        const back = pixels(W, H, put => {
            for (let y = 0; y < horizon; y++)
                for (let x = 0; x < W; x++) {
                    const a = ash(x, y) * 0.7 + ashSmall(x, y) * 0.3;
                    const base = Math.pow(y / horizon, 1.4);
                    const glow = Math.max(0, 1 - Math.hypot((x - crater.x) / 70, (y - crater.y) / 40)) * 0.35;
                    put(x, y, ditherPick(skyPal, base * 0.85 + glow - (a > 0.55 ? (a - 0.55) * 1.3 : 0), x, y));
                }
            const rock = ['#050203', '#0d0505', '#1c0807', '#3a0f08'].map(hex);
            for (let x = 0; x < W; x++) {
                const top = volcanoEdge(x);
                for (let y = top; y < horizon; y++) {
                    const lip = Math.max(0, 1 - (y - crater.y) / 30) * (1 - Math.min(1, Math.abs(x - crater.x) / 40));
                    const rim = y - top < 1 ? 0.35 : 0;
                    const ridge = Math.sin((x - crater.x) * 18 / (y - crater.y + 12) + Math.sin(y * 0.3)) > 0.75 ? 0.12 : 0;
                    put(x, y, ditherPick(rock, 0.1 + lip * 0.8 + rim + ridge + (x > crater.x ? -0.08 : 0), x, y));
                }
            }
        });

        // The river: centre and width per row, widening as it comes towards us.
        const riverX = (y: number) => {
            const f = (y - horizon) / (H - horizon);
            return cx + 22 * (1 - f) + Math.sin(f * 4.2 + 0.6) * W * 0.17 * f;
        };
        const riverW = (y: number) => 1.5 + ((y - horizon) / (H - horizon)) * 26;

        const groundPal = ['#030102', '#080304', '#120506', '#240807'].map(hex);
        const ground = pixels(W, H, put => {
            for (let y = horizon; y < H; y++)
                for (let x = 0; x < W; x++) {
                    const d = Math.abs(x - riverX(y)) - riverW(y);
                    const near = Math.max(0, 1 - d / 22);
                    const crack = hash(Math.floor(x / 3), Math.floor(y / 2)) < 0.012 && near < 0.6;
                    put(x, y, crack ? hex('#3a0e05') : ditherPick(groundPal, 0.15 + near * 0.75, x, y));
                }
        });

        // Lava frames: the same river and streams with the pattern flowing
        // a step further each frame, so the loop is seamless.
        const lava = ['#1a0404', '#4a0c05', '#8f1e08', '#d2460c', '#ff8a1e', '#ffd36a'].map(hex);
        const FRAMES = 12;
        const frames = Array.from({length: FRAMES}, (_, f) => {
            const ph = (f / FRAMES) * Math.PI * 2;
            return pixels(W, H, put => {
                for (let y = horizon; y < H; y++) {
                    const c = riverX(y), w = riverW(y);
                    for (let x = Math.floor(c - w); x <= Math.ceil(c + w); x++) {
                        const u = (x - c) / w;
                        if (Math.abs(u) > 1) continue;
                        const v = 0.62
                            + 0.22 * Math.sin(y * 0.5 - ph + 1.7 * Math.sin(x * 0.17 + y * 0.09))
                            + 0.14 * Math.sin(x * 0.7 + y * 0.25 - 2 * ph)
                            - 0.55 * u * u;
                        put(x, y, ditherPick(lava, v, x, y));
                    }
                }
                for (const path of streams)
                    for (const p of path) {
                        const fade = 1 - (p.s / path.length) * 0.5;
                        const v = (0.55 + 0.3 * Math.sin(p.s * 0.6 - ph * 2)) * fade;
                        put(p.x, p.y, ditherPick(lava, v + 0.1, p.x, p.y));
                        if (p.s % 3 === 0) put(p.x + 1, p.y, ditherPick(lava, v - 0.2, p.x, p.y));
                    }
                for (let x = -crater.half + 2; x <= crater.half - 2; x++) put(crater.x + x, crater.y + 1, lava[4 - (Math.abs(x) > 3 ? 1 : 0) + (f % 2)]);
            });
        });

        // Static glow around the river, dithered so it stays pixel-crisp.
        const glow = pixels(W, H, put => {
            const c = hex('#ff5a10');
            for (let y = horizon - 6; y < H; y++)
                for (let x = 0; x < W; x++) {
                    const d = y >= horizon ? Math.max(0, Math.abs(x - riverX(y)) - riverW(y)) : 99;
                    const g = y >= horizon ? Math.exp(-d / (6 + (y - horizon) * 0.15)) * 0.8 : 0;
                    if (g > bayer(x, y)) put(x, y, c, 90);
                }
        });

        // Basalt spires framing the sides, red-rimmed on the edges facing the lava.
        const spires = pixels(W, H, put => {
            const stone = [hex('#020101'), hex('#0a0303'), hex('#160505')];
            const rimC = hex('#8a2a0a'), rimDim = hex('#3a0c06');
            const r = rng(12);
            const profile = new Array<number>(W).fill(H);
            const add = (x0: number, w: number, top: number) => {
                for (let x = Math.floor(x0 - w); x <= x0 + w; x++) {
                    if (x < 0 || x >= W) continue;
                    const f = Math.abs(x - x0) / w;
                    const y = Math.round(top + Math.pow(f, 1.6) * (H - top) * 0.9 + (r() - 0.5) * 3);
                    profile[x] = Math.min(profile[x], y);
                }
            };
            add(-2, 16, H * 0.34);
            add(W * 0.06, 9, H * 0.18);
            add(W * 0.14, 7, H * 0.44);
            add(W + 2, 16, H * 0.3);
            add(W * 0.94, 10, H * 0.14);
            add(W * 0.85, 7, H * 0.48);
            for (let x = 0; x < W; x++) {
                for (let y = profile[x]; y < H; y++) {
                    const facing = x < cx ? (x + 1 < W && profile[x + 1] > y) : (x > 0 && profile[x - 1] > y);
                    const strata = Math.sin(y * 0.9 + x * 0.35 + Math.sin(x * 0.2) * 2) > 0.7;
                    const lit = Math.max(0, 1 - Math.abs(x - cx) / (W * 0.5)) * 0.6 + (strata ? 0.3 : 0);
                    put(x, y, facing ? rimC : (y === profile[x] ? rimDim : ditherPick(stone, lit, x, y)));
                }
            }
        });

        const embers = Array.from({length: 90}, () => ({
            x: random() * W, y: horizon + random() * (H - horizon), vy: 8 + random() * 18,
            sway: random() * 6, life: random()
        }));
        const emberColours: RGB[] = ['#ffd36a', '#ff8a1e', '#d2460c'].map(hex);
        const spb = 60 / 96;
        const G = 70;
        let last = 0;

        return (ctx, t, beat) => {
            const dt = Math.min(0.1, Math.max(0, t - last));
            last = t;
            const k = pulse(beat);
            const bar = Math.floor(beat / 4);
            const big = bar % 4 === 0;
            const sinceBar = (beat - bar * 4) * spb;
            const blast = Math.max(0, 1 - sinceBar / (big ? 1.6 : 0.8));

            ctx.drawImage(back.canvas, 0, 0);

            // Glow over the crater swells on each eruption.
            ctx.globalCompositeOperation = 'lighter';
            const plume = ctx.createRadialGradient(crater.x, crater.y, 2, crater.x, crater.y, big ? 70 : 45);
            plume.addColorStop(0, css(hex('#ff6a18'), 0.15 + 0.55 * blast * (big ? 1 : 0.6)));
            plume.addColorStop(1, 'rgba(255,90,20,0)');
            ctx.fillStyle = plume;
            ctx.fillRect(0, 0, W, horizon);
            ctx.globalCompositeOperation = 'source-over';

            ctx.drawImage(ground.canvas, 0, 0);
            ctx.drawImage(frames[Math.floor(t * 8) % FRAMES].canvas, 0, 0);

            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.35 + 0.25 * k;
            ctx.drawImage(glow.canvas, 0, 0);
            ctx.globalAlpha = 1;

            // Lava bombs, worked out from the bar so they need no state.
            const n = big ? 26 : 9;
            for (let i = 0; i < n; i++) {
                const vx = (hash(bar, i) - 0.5) * (big ? 70 : 40);
                const vy = -(35 + hash(i, bar) * (big ? 70 : 40));
                const s = sinceBar - hash(bar + i, 3) * 0.15;
                if (s < 0) continue;
                const x = crater.x + vx * s, y = crater.y + vy * s + 0.5 * G * s * s;
                if (y > horizon) continue;
                const heat = Math.max(0, 1 - s / 2.2);
                ctx.fillStyle = css(emberColours[heat > 0.66 ? 0 : heat > 0.33 ? 1 : 2], 0.4 + 0.6 * heat);
                ctx.fillRect(Math.round(x), Math.round(y), big && i % 3 === 0 ? 2 : 1, big && i % 3 === 0 ? 2 : 1);
                ctx.fillStyle = css(emberColours[2], 0.35 * heat);
                ctx.fillRect(Math.round(x - vx * 0.03), Math.round(y - (vy + G * s) * 0.03), 1, 1);
            }
            // A column of fire from the crater right on the downbeat.
            if (blast > 0) {
                const h = Math.round((big ? 22 : 10) * Math.min(1, sinceBar * 8));
                for (let y = 0; y < h; y++) {
                    const w = Math.round((crater.half - 3) * (1 - y / (h + 2)) * blast + (hash(y, Math.floor(t * 20)) - 0.5) * 2);
                    ctx.fillStyle = css(emberColours[y < h * 0.3 ? 0 : y < h * 0.7 ? 1 : 2], 0.8 * blast);
                    ctx.fillRect(crater.x - w, crater.y - y, w * 2 + 1, 1);
                }
            }
            ctx.globalCompositeOperation = 'source-over';

            ctx.drawImage(spires.canvas, 0, 0);

            // Embers drift upwards from the lava and fade.
            for (const e of embers) {
                e.y -= e.vy * dt;
                e.life -= dt * 0.25;
                if (e.y < 0 || e.life <= 0) {
                    const y = horizon + 4 + random() * (H - horizon - 4);
                    e.y = y;
                    e.x = riverX(y) + (random() - 0.5) * riverW(y) * 2;
                    e.life = 0.6 + random() * 0.4;
                }
                const x = e.x + Math.sin(t * 1.3 + e.sway) * 3;
                ctx.fillStyle = css(emberColours[Math.floor((1 - e.life) * 2.99)], Math.min(1, e.life * 1.5) * (0.6 + 0.4 * Math.sin(t * 9 + e.sway)));
                ctx.fillRect(Math.round(x), Math.round(e.y), 1, 1);
            }
        };
    }
};
