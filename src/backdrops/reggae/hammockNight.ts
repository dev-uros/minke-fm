import {bayer, Backdrop, css, disc, ditherPick, hash, hex, pixels, pulse, rng} from '../pixel';
import {drawPalm, glowSprite, Palm} from './fx';

/**
 * A striped hammock strung between two palms on a quiet beach at night,
 * rocking gently. Above, a starry sky with the Milky Way and the moon; below,
 * a path of moonlight glittering on the sea. A lantern on one trunk glows on
 * the beat.
 */
export const HAMMOCK_NIGHT: Backdrop = {
    id: 'reggae-hammock-night',
    name: 'Hammock under the stars',
    bpm: 68,
    create(W, H) {
        const random = rng(19);
        const horizon = Math.round(H * 0.6);
        const shore = Math.round(H * 0.76);
        const sky = ['#03040f', '#060a1e', '#0c1430', '#142044', '#1e2e58'].map(hex);
        const sea = ['#1a2a50', '#121e3e', '#0c1430', '#080e22'].map(hex);
        const sand = ['#1c2236', '#151a2a', '#0e111c', '#08090f'].map(hex);
        const moonX = Math.round(W * 0.5 + 34), moonY = 30, mr = 9;

        const back = pixels(W, H, put => {
            for (let y = 0; y < horizon; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, y / horizon, x, y));
            // Milky Way: a faint dithered band across the sky.
            for (let y = 0; y < horizon; y++)
                for (let x = 0; x < W; x++) {
                    const d = Math.abs((y - 10) - (x - W * 0.15) * 0.35) / 14;
                    const n = hash(Math.floor(x / 3), Math.floor(y / 3));
                    if (d < 1 && (1 - d) * (0.5 + n * 0.5) > 0.35 + bayer(x, y) * 0.5) put(x, y, hex('#2a3460'));
                }
            for (let y = horizon; y < shore + 8; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sea, (y - horizon) / (shore - horizon), x, y));
            for (let y = shore; y < H; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sand, (y - shore) / (H - shore), x, y));
            const moon = hex('#f4ecd0'), shade = hex('#c8bea0');
            disc(put, moonX, moonY, mr, (x, y) => (Math.hypot(x - moonX + 3, y - moonY - 2) < 3 || Math.hypot(x - moonX - 3, y - moonY + 3) < 2) ? shade : moon);
        });
        const moonGlow = glowSprite(30, hex('#a8b8e8'));
        const lampGlow = glowSprite(22, hex('#ffb050'));

        const stars = Array.from({length: Math.round(W * 0.5)}, () => ({
            x: Math.floor(random() * W), y: Math.floor(random() * (horizon - 6)),
            b: random(), seed: random() * 100
        }));

        // Two palms leaning apart; the hammock hangs between their trunks.
        const gap = Math.min(150, Math.round(W * 0.42));
        const left: Palm = {x: Math.round(W / 2 - gap / 2), base: H + 2, height: 158, lean: -26, frond: 36, girth: 7, phase: 0.8};
        const right: Palm = {x: Math.round(W / 2 + gap / 2), base: H + 2, height: 150, lean: 24, frond: 34, girth: 7, phase: 2.6};
        const trunkX = (p: Palm, y: number) => {
            const s = (p.base - y) / p.height;
            return p.x + p.lean * s * s;
        };
        const tieY = Math.round(H * 0.6);
        const A = {x: Math.round(trunkX(left, tieY)) + 3, y: tieY};
        const B = {x: Math.round(trunkX(right, tieY)) - 3, y: tieY + 2};
        const stripes = ['#8a3434', '#a08a3e', '#2e6a44', '#c8bfa8'];

        return (ctx, t, beat) => {
            const breath = pulse(beat);
            ctx.drawImage(back.canvas, 0, 0);
            ctx.globalAlpha = 0.5;
            ctx.drawImage(moonGlow, moonX - 30, moonY - 30);
            ctx.globalAlpha = 1;

            for (const s of stars) {
                const tw = hash(s.seed, Math.floor(t * 2 + s.seed));
                const a = s.b * (tw < 0.1 ? 0.2 : 1);
                ctx.fillStyle = css(hex('#dfe6ff'), 0.25 + a * 0.75);
                ctx.fillRect(s.x, s.y, 1, 1);
            }

            // Now and then a shooting star.
            const st = t % 23;
            if (st < 0.9) {
                const u = st / 0.9;
                const sx = W * 0.2 + (Math.floor(t / 23) * 97) % (W * 0.5);
                for (let i = 0; i < 10; i++) {
                    ctx.fillStyle = css(hex('#ffffff'), (1 - i / 10) * (1 - u));
                    ctx.fillRect(Math.round(sx + u * 60 - i * 2), Math.round(12 + u * 20 - i * 0.7), 1, 1);
                }
            }

            // Moon path: glittering dashes on the sea.
            const slot = Math.floor(t * 5);
            for (let y = horizon + 1; y < shore + 4; y++) {
                const d = (y - horizon) / (shore - horizon);
                const span = 4 + d * 22;
                for (let i = 0; i < 3; i++) {
                    if (hash(y * 5 + i, slot) > 0.6) continue;
                    const x = Math.round(moonX + (hash(y + i * 13, slot * 2) * 2 - 1) * span);
                    ctx.fillStyle = hash(y, i + slot) < 0.3 ? '#e8ecff' : '#7a8ac0';
                    ctx.fillRect(x, y, 1 + Math.round(d * 3), 1);
                }
            }
            // Ripples and a soft wash on the sand.
            const roll = (t * 0.1) % 1;
            for (let k = 0; k < 6; k++) {
                const z = (k + roll) / 6;
                const y = Math.round(horizon + (shore - horizon) * Math.pow(z, 1.5));
                ctx.fillStyle = css(hex('#4a5a90'), 0.15 + 0.35 * z);
                const seg = 5 + Math.round(z * 12);
                for (let x = -seg; x < W; x += seg * 2) ctx.fillRect(x + Math.round(hash(k, Math.floor(x / seg)) * seg), y, seg, 1);
            }
            const wash = 0.5 - 0.5 * Math.cos(t * Math.PI * 2 / 8);
            for (let x = 0; x < W; x++) {
                const edge = Math.round(shore + 2 + wash * 5 + Math.sin(x * 0.07 + t * 0.3) * 1.5);
                ctx.fillStyle = 'rgba(40,60,110,0.5)';
                ctx.fillRect(x, shore + 1, 1, edge - shore - 1);
                if (hash(x, Math.floor(t * 3)) < 0.75) {
                    ctx.fillStyle = '#8a9ad0';
                    ctx.fillRect(x, edge, 1, 1);
                }
            }

            drawPalm(ctx, left, t, '#020308', '#141a30', 0.5);
            drawPalm(ctx, right, t, '#020308', '#141a30', 0.5);

            // The hammock: ropes to the trunks, then a sagging striped cloth.
            const swing = Math.sin(t * Math.PI * 2 / 5.5);
            const x0 = A.x + 7, x1 = B.x - 7;
            const sag = 24;
            const cloth = (u: number) => ({
                x: x0 + (x1 - x0) * u + Math.sin(u * Math.PI) * swing * 4,
                y: A.y + 5 + (B.y - A.y) * u + Math.sin(u * Math.PI) * (sag + Math.abs(swing) * 1.5)
            });
            ctx.fillStyle = '#6a6a72';
            const start = cloth(0), end = cloth(1);
            for (let i = 0; i <= 10; i++) {
                const u = i / 10;
                ctx.fillRect(Math.round(A.x + (start.x - A.x) * u), Math.round(A.y + (start.y - A.y) * u), 1, 1);
                ctx.fillRect(Math.round(B.x + (end.x - B.x) * u), Math.round(B.y + (end.y - B.y) * u), 1, 1);
            }
            const n = Math.round(x1 - x0) * 2;
            for (let i = 0; i <= n; i++) {
                const u = i / n;
                const p = cloth(u);
                const depth = Math.round(2 + Math.sin(u * Math.PI) * 8);
                const stripe = stripes[Math.floor(u * 12) % stripes.length];
                ctx.fillStyle = stripe;
                ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, depth);
                ctx.fillStyle = 'rgba(200,215,255,0.45)';
                ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
                ctx.fillStyle = 'rgba(0,0,10,0.45)';
                ctx.fillRect(Math.round(p.x), Math.round(p.y) + depth - 1, 1, 1);
                // Fringe hanging from the lower edge.
                if (i % 3 === 0 && u > 0.12 && u < 0.88) {
                    ctx.fillStyle = '#7a7268';
                    ctx.fillRect(Math.round(p.x + swing * 0.6), Math.round(p.y) + depth, 1, 2);
                }
            }

            // Lantern hung on the left trunk, with a warm pool of light.
            const lx = Math.round(trunkX(left, tieY - 22)) + 5, ly = tieY - 22;
            const flicker = 0.85 + 0.15 * Math.sin(t * 7) * Math.sin(t * 3.1);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = (0.35 + 0.35 * breath) * flicker;
            ctx.drawImage(lampGlow, lx - 22, ly - 20);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#2a2018';
            ctx.fillRect(lx - 3, ly - 4, 1, 4);
            ctx.fillRect(lx - 2, ly - 4, 4, 1);
            ctx.fillRect(lx, ly - 3, 1, 1);
            ctx.fillStyle = '#ffd890';
            ctx.fillRect(lx - 1, ly - 2, 3, 4);
            ctx.fillStyle = '#fff4d0';
            ctx.fillRect(lx, ly - 1, 1, 2);
            ctx.fillStyle = '#2a2018';
            ctx.fillRect(lx - 1, ly + 2, 3, 1);
        };
    }
};
