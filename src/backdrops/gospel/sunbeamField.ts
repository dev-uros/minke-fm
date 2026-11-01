import {Backdrop, bayer, css, ditherPick, hex, pixels, pulse, rng, wrappingNoise} from '../pixel';

/**
 * Late afternoon over open country: the sun hides behind a heavy cloud and
 * breaks out in long rays that fan down over rolling fields and a small white
 * chapel on a far hill. Wind runs through the wheat in waves, small clouds
 * drift by, and the rays swell on the beat.
 */
export const SUNBEAM_FIELD: Backdrop = {
    id: 'gospel-sunbeam-field',
    name: 'Sunbeams',
    bpm: 80,
    create(W, H) {
        const random = rng(64);
        const horizon = Math.round(H * 0.6);
        const sun = {x: Math.round(W * 0.55), y: Math.round(H * 0.2)};
        const sky = ['#3c5478', '#5a7398', '#8a9cb8', '#c7c0bc', '#f0d6b0'].map(hex);

        const back = pixels(W, H, put => {
            for (let y = 0; y < horizon; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, y / horizon, x, y));
        });

        // The big cloud over the sun: noise shaped into a bank, lit on its rim.
        const n1 = wrappingNoise(W, H, 26, random), n2 = wrappingNoise(W, H, 9, random);
        const cloudTone = ['#4a4f6a', '#6a6c86', '#9a96a8', '#d6c6bc', '#fff0d2'].map(hex);
        const bank = pixels(W, H, put => {
            for (let y = 0; y < horizon; y++) {
                for (let x = 0; x < W; x++) {
                    const dx = (x - sun.x) / (W * 0.45), dy = (y - sun.y + 2) / (H * 0.17);
                    const shape = 1 - Math.hypot(dx, dy);
                    const v = shape + (n1(x, y) - 0.5) * 0.7 + (n2(x, y) - 0.5) * 0.3;
                    if (v < 0.05) continue;
                    // Brighter towards the sun and along the bottom edge.
                    const toSun = 1 - Math.min(1, Math.hypot((x - sun.x) / 60, (y - sun.y) / 40));
                    const rim = v < 0.16 ? 0.45 : 0;
                    const shade = 0.15 + toSun * 0.55 + rim + (y - sun.y) / H * 0.3 - (v - 0.05) * 0.25;
                    put(x, y, ditherPick(cloudTone, shade, x, y));
                }
            }
        });

        // Small clouds that drift across, on a wrapping strip.
        const n3 = wrappingNoise(W, H, 14, random);
        const puffs = pixels(W, H, put => {
            const c = ['#7d86a2', '#b3b4c4', '#e8dcd0'].map(hex);
            for (let y = 6; y < horizon * 0.55; y++) {
                for (let x = 0; x < W; x++) {
                    const band = Math.sin(((y - 6) / (horizon * 0.55 - 6)) * Math.PI);
                    const v = n3(x, y * 1.8) * band;
                    if (v > 0.55 + bayer(x, y) * 0.08) put(x, y, ditherPick(c, (v - 0.55) * 4, x, y));
                }
            }
        });

        // Land: far hills with a chapel, then fields of wheat and grass.
        const land = pixels(W, H, put => {
            const far = ['#3c4a5c', '#4d5a66', '#6a6e6a'].map(hex);
            const mid = ['#2e3b26', '#4a5a2c', '#7d7a38', '#b09a48'].map(hex);
            const near = ['#2a2a18', '#4c4422', '#8a7430', '#c2a24a', '#e0c46a'].map(hex);
            for (let x = 0; x < W; x++) {
                const hFar = Math.round(horizon - 6 - Math.sin(x * 0.015 + 1) * 5 - Math.sin(x * 0.05) * 2);
                for (let y = hFar; y < H; y++) put(x, y, ditherPick(far, 0.3 + (y - hFar) / 30, x, y));
                const hMid = Math.round(horizon + 6 - Math.sin(x * 0.02 + 3) * 6);
                for (let y = hMid; y < H; y++) put(x, y, ditherPick(mid, 0.9 - (y - hMid) / 50 + Math.sin(x * 0.04) * 0.15, x, y));
                const hNear = Math.round(H * 0.8 - Math.sin(x * 0.012 + 0.5) * 8);
                for (let y = hNear; y < H; y++) put(x, y, ditherPick(near, 0.85 - (y - hNear) / 40, x, y));
            }
            // A row of trees along the far hill.
            for (let i = 0; i < W / 9; i++) {
                const tx = random() * W, r = 1 + random() * 2.5;
                const ty = Math.round(horizon - 5 - Math.sin(tx * 0.015 + 1) * 5 - Math.sin(tx * 0.05) * 2);
                for (let y = -r * 2; y <= 0; y++)
                    for (let x = -r; x <= r; x++)
                        if ((x / r) ** 2 + ((y + r) / r) ** 2 <= 1.1) put(tx + x, ty + y, hex(x < 0 ? '#2b3a32' : '#1f2b26'));
            }
            // The little chapel: white walls, a dark roof and a steeple.
            const chX = Math.round(W * 0.68), chY = Math.round(horizon - 6 - Math.sin(W * 0.68 * 0.015 + 1) * 5 - Math.sin(W * 0.68 * 0.05) * 2);
            const white = hex('#efe6d6'), shade = hex('#b8ab9c'), roof = hex('#5a3a34');
            for (let y = chY - 5; y < chY + 1; y++)
                for (let x = chX; x < chX + 10; x++) put(x, y, x < chX + 7 ? white : shade);
            for (let k = 0; k < 3; k++)
                for (let x = chX - 1 + k; x < chX + 11 - k; x++) put(x, chY - 6 - k, roof);
            for (let y = chY - 13; y < chY - 5; y++) {
                put(chX + 1, y, white);
                put(chX + 2, y, white);
                put(chX + 3, y, shade);
            }
            for (let k = 0; k < 3; k++) put(chX + 2, chY - 14 - k, roof);
            put(chX + 1, chY - 15, roof);
            put(chX + 3, chY - 15, roof);
            put(chX + 4, chY - 3, hex('#4a3a40'));
            put(chX + 4, chY - 2, hex('#4a3a40'));
        });

        const blades = Array.from({length: W}, () => ({h: 3 + Math.floor(random() * 7), c: random()}));
        const bladeTones = ['#5a4a22', '#8a7430', '#c2a24a', '#ead27a'];

        const rays = Array.from({length: 11}, (_, i) => ({
            a: Math.PI * (0.22 + (i / 10) * 0.56) + (random() - 0.5) * 0.05,
            w: 0.025 + random() * 0.04,
            phase: random() * 6
        }));
        const rayC = hex('#fff0c8');

        return (ctx, t, beat) => {
            const swell = 0.8 + 0.2 * pulse(beat);
            ctx.drawImage(back.canvas, 0, 0);

            const drift = Math.floor(t * 1.5) % W;
            ctx.drawImage(puffs.canvas, -drift, 0);
            ctx.drawImage(puffs.canvas, W - drift, 0);

            // Glow behind the cloud.
            const g = ctx.createRadialGradient(sun.x, sun.y, 2, sun.x, sun.y, H * 0.45);
            g.addColorStop(0, `rgba(255,236,190,${(0.6 * swell).toFixed(3)})`);
            g.addColorStop(1, 'rgba(255,236,190,0)');
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, horizon);
            ctx.globalCompositeOperation = 'source-over';

            ctx.drawImage(bank.canvas, 0, 0);
            ctx.drawImage(land.canvas, 0, 0);

            // Wind waves: brighter bands sweeping across the wheat.
            ctx.fillStyle = 'rgba(255,230,150,0.12)';
            for (let y = horizon + 8; y < H; y += 2) {
                const depth = (y - horizon) / (H - horizon);
                for (let x = 0; x < W; x += 3) {
                    const wave = Math.sin(x * 0.04 / (0.4 + depth) - t * 1.1 + y * 0.12);
                    if (wave > 0.75 + bayer(x, y) * 0.2) ctx.fillRect(x, y, 3, 2);
                }
            }

            // Rays fan down from behind the cloud and slowly breathe.
            ctx.globalCompositeOperation = 'lighter';
            const reach = H * 1.3;
            for (const r of rays) {
                const strength = (0.09 + 0.06 * Math.sin(t * 0.35 + r.phase)) * swell;
                if (strength <= 0.01) continue;
                const a = r.a + Math.sin(t * 0.05 + r.phase) * 0.02;
                const grad = ctx.createLinearGradient(sun.x, sun.y, sun.x + Math.cos(a) * reach, sun.y + Math.sin(a) * reach);
                grad.addColorStop(0.15, css(rayC, strength));
                grad.addColorStop(1, css(rayC, 0));
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(sun.x, sun.y + 6);
                ctx.lineTo(sun.x + Math.cos(a - r.w) * reach, sun.y + Math.sin(a - r.w) * reach);
                ctx.lineTo(sun.x + Math.cos(a + r.w) * reach, sun.y + Math.sin(a + r.w) * reach);
                ctx.closePath();
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';

            // Foreground grass, bending with the same wind.
            for (let x = 0; x < W; x++) {
                const b = blades[x];
                const lean = Math.sin(x * 0.05 - t * 1.6) + Math.sin(x * 0.013 - t * 0.7);
                for (let k = 0; k < b.h; k++) {
                    const bend = Math.round((k / b.h) * lean * 1.5);
                    ctx.fillStyle = bladeTones[Math.min(3, Math.floor(b.c * 2 + (k / b.h) * 2))];
                    ctx.fillRect(x + bend, H - 1 - k, 1, 1);
                }
            }
        };
    }
};
