import {Backdrop, canvas, css, ditherPick, hash, hex, pixels, pulse, RGB, rng} from '../pixel';

/**
 * A dark side chapel: a three-tier iron stand of votive candles in red and
 * amber glass, set below a stone niche. Each flame flickers on its own, a few
 * threads of smoke curl up, and the warm glow on the wall breathes with the beat.
 */
export const VOTIVE_CANDLES: Backdrop = {
    id: 'gospel-votive-candles',
    name: 'Votive candles',
    bpm: 66,
    create(W, H) {
        const random = rng(57);
        const cx = Math.round(W / 2);
        const glowY = Math.round(H * 0.62);

        // Wall, niche and floor.
        const wall = ['#040306', '#0b070a', '#160d0f', '#251515', '#3a2019', '#55301f'].map(hex);
        const nicheTop = Math.round(H * 0.12), nicheW = Math.round(Math.min(W * 0.22, 70)), nicheBase = Math.round(H * 0.5);
        const room = pixels(W, H, put => {
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const d = Math.hypot((x - cx) / (W * 0.55), (y - glowY) / (H * 0.75));
                    let v = 0.95 - d;
                    const row = Math.floor(y / 6);
                    const off = (row % 2) * 5;
                    if (y % 6 === 0 || (x + off) % 11 === 0) v -= 0.14;
                    v += (hash(Math.floor((x + off) / 11), row) - 0.5) * 0.1;
                    // The niche: a round-headed recess, darker inside.
                    const nx = x - cx, ny = y - (nicheTop + nicheW / 2);
                    const inNiche = Math.abs(nx) < nicheW / 2 && y < nicheBase && (y > nicheTop + nicheW / 2 || nx * nx + ny * ny < (nicheW / 2) ** 2);
                    if (inNiche) v = v * 0.5 + (y - nicheTop) / (nicheBase - nicheTop) * 0.1;
                    const edge = Math.abs(Math.abs(nx) - nicheW / 2) < 1.5 && y < nicheBase && y > nicheTop + nicheW / 2
                        || Math.abs(Math.hypot(nx, ny) - nicheW / 2) < 1.5 && y <= nicheTop + nicheW / 2;
                    if (edge) v += 0.22;
                    if (y > H * 0.88) v = 0.35 - (y - H * 0.88) / (H * 0.12) * 0.25 - Math.abs(x - cx) / W * 0.3;
                    put(x, y, ditherPick(wall, v, x, y));
                }
            }
            // A small plain cross in the niche, catching the candlelight.
            const crossX = cx, crossY = nicheTop + Math.round(nicheW * 0.45);
            for (let k = 0; k < 18; k++) put(crossX, crossY + k, hex(k < 9 ? '#c99a5c' : '#8a6038'));
            for (let k = -5; k <= 5; k++) put(crossX + k, crossY + 5, hex('#b58650'));
            for (let k = 0; k < 18; k++) put(crossX + 1, crossY + k, hex('#5a3a22'));
        });

        // The stand: three tiers of candles, the front row widest.
        interface Candle {x: number; y: number; cup: RGB; rim: RGB; lit: boolean; seed: number; smoke: boolean}
        const candles: Candle[] = [];
        const cups: Array<[string, string]> = [['#a3122a', '#ff5a5a'], ['#c0461a', '#ff9a4a'], ['#7a0f22', '#e0405a'], ['#c08a1a', '#ffd070']];
        const tiers = [0, 1, 2].map(i => ({
            y: Math.round(H * (0.64 + i * 0.1)),
            half: Math.round(Math.min(W * 0.2, 75) + i * 12)
        }));
        const stand = canvas(W, H);
        const g = stand.ctx;
        tiers.forEach((tier, i) => {
            const step = 11;
            for (let x = cx - tier.half; x <= cx + tier.half - 6; x += step) {
                const [cup, rim] = cups[Math.floor(random() * cups.length)].map(hex);
                const lit = random() < 0.82;
                candles.push({x: x + (i % 2) * 5, y: tier.y - 8, cup, rim, lit, seed: random() * 100, smoke: lit && random() < 0.12});
            }
            g.fillStyle = '#120c0c';
            g.fillRect(cx - tier.half - 4, tier.y, tier.half * 2 + 12, 3);
            g.fillStyle = '#3a2620';
            g.fillRect(cx - tier.half - 4, tier.y, tier.half * 2 + 12, 1);
        });
        // Legs and the front rail.
        g.fillStyle = '#0d0909';
        const last = tiers[2];
        for (const s of [-1, 1]) g.fillRect(cx + s * (last.half + 2) - (s > 0 ? 0 : 1), tiers[0].y, 2, H - tiers[0].y);
        g.fillRect(cx - last.half - 4, H - 10, last.half * 2 + 12, 2);

        // Halo sprite for each flame.
        const halo = canvas(32, 32);
        const hg = halo.ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        hg.addColorStop(0, 'rgba(255,190,110,0.55)');
        hg.addColorStop(0.4, 'rgba(255,140,60,0.18)');
        hg.addColorStop(1, 'rgba(255,120,40,0)');
        halo.ctx.fillStyle = hg;
        halo.ctx.fillRect(0, 0, 32, 32);

        return (ctx, t, beat) => {
            const breath = 0.85 + 0.15 * pulse(beat);
            ctx.drawImage(room.canvas, 0, 0);

            // Overall warm light from the stand.
            const warm = ctx.createRadialGradient(cx, tiers[1].y, 4, cx, tiers[1].y, H * 0.75);
            const flick = 0.9 + 0.1 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
            warm.addColorStop(0, `rgba(255,150,70,${(0.22 * breath * flick).toFixed(3)})`);
            warm.addColorStop(1, 'rgba(255,150,70,0)');
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = warm;
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = 'source-over';

            // Smoke threads curl up from a few wicks.
            for (const c of candles) {
                if (!c.smoke) continue;
                for (let k = 0; k < 26; k++) {
                    const rise = (k + t * 6 + c.seed) % 26;
                    const sx = c.x + 3 + Math.round(Math.sin(t * 0.9 + rise * 0.25 + c.seed) * (rise / 8));
                    ctx.fillStyle = `rgba(200,180,170,${(0.18 * (1 - rise / 26)).toFixed(3)})`;
                    ctx.fillRect(sx, Math.round(c.y - 5 - rise * 1.3), 1, 1);
                }
            }

            ctx.drawImage(stand.canvas, 0, 0);

            for (const c of candles) {
                const {x, y} = c;
                // Glass cup, glowing from inside when lit.
                const f = c.lit ? 0.7 + 0.3 * hash(Math.floor(t * 12), c.seed) : 0;
                ctx.fillStyle = css(c.cup, 0.6 + 0.4 * f);
                ctx.fillRect(x, y, 7, 8);
                ctx.fillStyle = css(c.rim, c.lit ? 0.5 + 0.5 * f : 0.25);
                ctx.fillRect(x + 1, y + 1, 4, 3);
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.fillRect(x, y, 7, 1);
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fillRect(x, y + 7, 7, 1);
                ctx.fillRect(x + 6, y + 1, 1, 6);
                if (!c.lit) continue;

                // Flame: sways and stretches, with a white core.
                const sway = Math.round(Math.sin(t * 2.3 + c.seed) * 0.6 + (hash(Math.floor(t * 8), c.seed + 1) - 0.5) * 0.8);
                const tall = 4 + (hash(Math.floor(t * 10), c.seed + 2) > 0.7 ? 1 : 0);
                ctx.fillStyle = '#ff7a24';
                ctx.fillRect(x + 3 + sway, y - tall, 1, tall - 1);
                ctx.fillRect(x + 2, y - 2, 3, 2);
                ctx.fillStyle = '#ffd27a';
                ctx.fillRect(x + 3, y - 3, 1, 3);
                ctx.fillStyle = '#fff6d8';
                ctx.fillRect(x + 3, y - 1, 1, 1);

                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.55 * f * breath;
                ctx.drawImage(halo.canvas, x + 3 - 16, y - 2 - 16);
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
            }
        };
    }
};
