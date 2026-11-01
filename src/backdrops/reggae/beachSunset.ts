import {bayer, Backdrop, css, disc, ditherPick, hash, hex, pixels, pulse, rng, wrappingNoise} from '../pixel';
import {drawPalm, glowSprite, Palm} from './fx';

/**
 * A beach at sunset: the sun slowly sinking into a violet sea, swells rolling
 * in and washing up the sand in a line of foam, palms swaying in the
 * foreground and gulls drifting past. The sun's glow breathes on the beat.
 */
export const BEACH_SUNSET: Backdrop = {
    id: 'reggae-beach-sunset',
    name: 'Sunset beach',
    bpm: 76,
    create(W, H) {
        const random = rng(41);
        const horizon = Math.round(H * 0.55);
        const shore = Math.round(H * 0.74);
        const sky = ['#241440', '#3c1c5a', '#6a2868', '#a23c6a', '#d65e60', '#f48a58', '#ffc070'].map(hex);
        const sea = ['#f09a68', '#c86068', '#8a3c66', '#5a2a5c', '#3a1e4c', '#2a1840'].map(hex);
        const sand = ['#7a4a5a', '#5e3850', '#432842', '#2c1a32'].map(hex);

        const back = pixels(W, H, put => {
            for (let y = 0; y < horizon; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, Math.pow(y / horizon, 0.85), x, y));
            for (let i = 0; i < 30; i++) put(random() * W, random() * horizon * 0.3, hex('#ffd6f0'), 60 + random() * 90);
            for (let y = horizon; y < shore + 14; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sea, Math.pow((y - horizon) / (shore - horizon), 0.7), x, y));
            for (let y = shore; y < H; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sand, (y - shore) / (H - shore), x, y));
        });

        // Long thin clouds, lit orange underneath, in a strip that scrolls slowly.
        const CL = W * 2;
        const clouds = pixels(CL, horizon, put => {
            const lit = hex('#ffb478'), mid = hex('#c8506e'), dark = hex('#5a2662');
            for (let i = 0; i < 9; i++) {
                const cx = random() * CL, cy = 12 + random() * horizon * 0.62;
                const len = 30 + random() * 70, th = 2 + random() * 3;
                for (let y = -th; y <= th; y++) {
                    for (let x = -len; x <= len; x++) {
                        const d = Math.pow(x / len, 2) + Math.pow(y / th, 2);
                        if (d > 1 - bayer(x, y) * 0.35) continue;
                        const px = ((Math.round(cx + x) % CL) + CL) % CL;
                        const c = y > th * 0.3 ? lit : y > -th * 0.3 ? mid : dark;
                        put(px, cy + y, c);
                    }
                }
            }
        });

        const R = Math.round(H * 0.11);
        const sun = pixels(2 * R + 1, 2 * R + 1, put => {
            const cols = ['#fff6c8', '#ffe08a', '#ffbd5a', '#ff9348'].map(hex);
            disc(put, R, R, R, (x, y) => ditherPick(cols, y / (2 * R), x, y));
        });
        const halo = glowSprite(R * 3, hex('#ffc080'), 1.6);
        const sunX = Math.round(W * 0.5);

        const edgeNoise = wrappingNoise(W, 4, 14, random);
        const palms: Palm[] = [
            {x: Math.round(W * 0.06), base: H + 2, height: 128, lean: 22, frond: 34, girth: 6, phase: 0},
            {x: Math.round(W * 0.16), base: H + 4, height: 96, lean: 12, frond: 26, girth: 5, phase: 1.7},
            {x: Math.round(W * 0.94), base: H + 2, height: 118, lean: -20, frond: 32, girth: 6, phase: 3.1}
        ];
        const gulls = Array.from({length: 4}, () => ({
            y: 20 + random() * 40, speed: 3 + random() * 4, seed: random() * 1000, flap: 3 + random() * 2
        }));

        return (ctx, t, beat) => {
            const glow = pulse(beat);
            ctx.drawImage(back.canvas, 0, 0, W, horizon, 0, 0, W, horizon);

            // Sun bobs slowly between half-set and nearly gone.
            const set = 0.5 - 0.5 * Math.cos(t * Math.PI * 2 / 120);
            const sy = Math.round(horizon - R * 1.5 + set * R * 1.1);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.3 + 0.25 * glow;
            ctx.drawImage(halo, sunX - R * 3, sy + R - R * 3);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            const visible = Math.min(2 * R + 1, horizon - sy);
            if (visible > 0) ctx.drawImage(sun.canvas, 0, 0, 2 * R + 1, visible, sunX - R, sy, 2 * R + 1, visible);

            const drift = Math.floor(t * 1.5) % CL;
            ctx.drawImage(clouds.canvas, -drift, 0);
            ctx.drawImage(clouds.canvas, CL - drift, 0);

            ctx.drawImage(back.canvas, 0, horizon, W, H - horizon, 0, horizon, W, H - horizon);
            ctx.fillStyle = css(hex('#ffd890'), 0.6);
            ctx.fillRect(0, horizon, W, 1);

            // Glitter path under the sun.
            const slot = Math.floor(t * 6);
            for (let y = horizon + 1; y < shore; y++) {
                const d = (y - horizon) / (shore - horizon);
                const span = R * (0.5 + d * 1.6);
                for (let i = 0; i < 3; i++) {
                    const h = hash(y * 3 + i, slot + i * 7);
                    if (h > 0.55 + 0.2 * (1 - glow)) continue;
                    const x = Math.round(sunX + (hash(y, slot * 3 + i) * 2 - 1) * span);
                    ctx.fillStyle = h < 0.2 ? '#fff0b0' : '#ffb868';
                    ctx.fillRect(x, y, 2 + Math.round(d * 4), 1);
                }
            }

            // Swells rolling towards the beach.
            const roll = (t * 0.12) % 1;
            for (let k = 0; k < 9; k++) {
                const z = (k + roll) / 9;
                const y = Math.round(horizon + (shore - horizon) * Math.pow(z, 1.7));
                ctx.fillStyle = css(hex('#ffc8a8'), 0.08 + 0.3 * z);
                const seg = 6 + Math.round(z * 20);
                for (let x = -seg; x < W; x += seg * 2) {
                    const off = Math.round(hash(k, Math.floor(x / seg)) * seg);
                    ctx.fillRect(x + off, y, Math.round(seg * 0.8), 1);
                }
            }

            // The wash: water runs up the sand, then slides back leaving a dark wet band.
            const p = (t / 7) % 1;
            const reach = p < 0.35 ? Math.sin((p / 0.35) * Math.PI / 2) : Math.cos(((p - 0.35) / 0.65) * Math.PI / 2);
            const maxEdge = shore + 14;
            for (let x = 0; x < W; x++) {
                const wob = edgeNoise(x + t * 2, 0) * 5 + Math.sin(x * 0.04 + t * 0.5) * 2;
                const edge = Math.round(shore + 2 + reach * 12 + wob - 2);
                const wet = Math.round(maxEdge + wob - 2);
                ctx.fillStyle = 'rgba(30,14,40,0.35)';
                ctx.fillRect(x, shore + 2, 1, wet - shore - 2);
                ctx.fillStyle = 'rgba(120,70,120,0.55)';
                ctx.fillRect(x, shore, 1, edge - shore);
                const foam = reach > 0.05 && hash(x, Math.floor(t * 4)) < 0.85;
                if (foam) {
                    ctx.fillStyle = reach > 0.5 ? '#ffe6dc' : '#e8b8c0';
                    ctx.fillRect(x, edge, 1, 1);
                    if (hash(x * 2, Math.floor(t * 3)) < 0.35) ctx.fillRect(x, edge - 2, 1, 1);
                }
            }
            // A breaker just offshore that curls before each wash.
            const br = p > 0.75 ? (p - 0.75) / 0.25 : 0;
            if (br > 0) {
                const by = Math.round(shore - 5 + br * 6);
                ctx.fillStyle = css(hex('#ffe0d0'), 0.4 + 0.5 * br);
                for (let x = 0; x < W; x++) if (hash(x, 3) < 0.7 + br * 0.3) ctx.fillRect(x, by, 1, 1);
            }

            for (const g of gulls) {
                const x = Math.round(((g.seed + t * g.speed) % (W + 40)) - 20);
                const y = Math.round(g.y + Math.sin(t * 0.4 + g.seed) * 4);
                const up = Math.sin(t * g.flap + g.seed) > 0;
                ctx.fillStyle = '#2a1430';
                ctx.fillRect(x, y, 1, 1);
                ctx.fillRect(x - 2, y + (up ? -1 : 1), 2, 1);
                ctx.fillRect(x + 1, y + (up ? -1 : 1), 2, 1);
            }

            for (const palm of palms) drawPalm(ctx, palm, t, '#12081a');
        };
    }
};
