import {Backdrop, bayer, css, disc, ditherPick, hash, hex, pixels, pulse, rng} from '../pixel';

/**
 * A beach at dusk on an old VHS tape: the sun resting on the sea with its
 * reflection shimmering, waves washing in, palms swaying at the edges, a
 * beach bar's neon sign buzzing, and now and then the tracking wobbles.
 */
export const VHS_BEACH: Backdrop = {
    id: 'synthwave-vhs-beach',
    name: 'VHS beach',
    bpm: 96,
    create(W, H) {
        const random = rng(29);
        const cx = Math.round(W / 2);
        const horizon = Math.round(H * 0.56);
        const shore = Math.round(H * 0.8);
        const sun = {x: cx, y: horizon - 4, r: 22};
        const silhouette = hex('#14061e');

        const back = pixels(W, H, put => {
            const sky = ['#1c0a3c', '#3a1258', '#6a1c6c', '#a8336e', '#e05a72', '#ff8f68', '#ffc27a'].map(hex);
            for (let y = 0; y < horizon; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, Math.pow(y / horizon, 1.3), x, y));
            for (let i = 0; i < 30; i++) put(random() * W, random() * horizon * 0.3, hex('#ffffff'), 40 + random() * 120);
            disc(put, sun.x, sun.y, sun.r, (x, y) =>
                ditherPick(['#fff4c0', '#ffd890', '#ffb070', '#ff8a6a'].map(hex), (y - sun.y + sun.r) / (sun.r * 2), x, y));
            // Long thin clouds across the sun.
            for (const [cy, len, off] of [[sun.y - 12, 0.5, -0.1], [sun.y - 4, 0.36, 0.12], [24, 0.4, -0.25]]) {
                const x0 = Math.round(cx + (off - len / 2) * W), x1 = Math.round(cx + (off + len / 2) * W);
                for (let x = x0; x < x1; x++) {
                    const taper = Math.min(x - x0, x1 - x) / 6;
                    const h = Math.min(3, taper);
                    for (let y = 0; y < h; y++) put(x, cy + y, hex(y === 0 ? '#ffa0a0' : y === 1 ? '#a83a72' : '#6a2268'));
                }
            }
            // Sea: lighter near the horizon, deep near the shore.
            const sea = ['#b04a80', '#7a2c78', '#4e1a62', '#2e0f48', '#1c0a36'].map(hex);
            for (let y = horizon; y < shore; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sea, Math.pow((y - horizon) / (shore - horizon), 0.7), x, y));
            const sand = ['#5a2a4a', '#46203e', '#321732'].map(hex);
            for (let y = shore; y < H; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sand, (y - shore) / (H - shore), x, y));
            for (let x = 0; x < W; x++) put(x, horizon, hex('#ffb0a0'));
        });

        // A palm: curved trunk plus a crown of drooping fronds, on its own layer.
        const palm = (base: number, lean: number, height: number, seed: number) => {
            const r = rng(seed);
            const top = {x: base + lean, y: H - height};
            const trunk = pixels(W, H, put => {
                for (let i = 0; i <= height; i++) {
                    const f = i / height;
                    const x = base + lean * Math.pow(f, 1.6);
                    const w = Math.round(4 - f * 2);
                    for (let k = 0; k < w; k++) put(x + k - (w >> 1), H - i, i % 5 === 0 ? hex('#22102e') : silhouette);
                }
            });
            const size = 96;
            const crown = pixels(size, size, put => {
                const c = size / 2;
                const n = 12;
                for (let k = 0; k < n; k++) {
                    const a = Math.PI * (0.9 + (k / (n - 1)) * 1.2) + (r() - 0.5) * 0.15;
                    const up = -Math.sin(a);
                    const len = (28 + r() * 10) * (1 - Math.max(0, up) * 0.4);
                    const dir = Math.cos(a) < 0 ? -1 : 1;
                    for (let s = 0; s <= len; s++) {
                        const f = s / len;
                        const x = c + Math.cos(a) * s;
                        const y = c + Math.sin(a) * s * 0.6 - s * 0.5 * (1 - f * 1.5);
                        put(x, y, silhouette);
                        if (f < 0.75) put(x, y + 1, silhouette);
                        // Leaflets hanging from the rib.
                        const leaf = Math.round((1 - f * 0.5) * 6);
                        if (s > 2 && s % 2 === 0)
                            for (let q = 1; q <= leaf; q++) {
                                put(x + dir * q * 0.6, y + q, silhouette);
                                if (q < leaf - 2) put(x - dir * q * 0.4, y + q, silhouette);
                            }
                    }
                }
                disc(put, c, c + 1, 3, () => silhouette);
            });
            return {trunk, crown, top, size, phase: r() * 6};
        };
        const palms = [
            palm(Math.round(W * 0.1), Math.round(W * 0.08), 150, 3),
            palm(Math.round(W * 0.93), -Math.round(W * 0.1), 168, 8),
            palm(Math.round(W * 0.82), -Math.round(W * 0.03), 104, 13)
        ];

        // Beach bar on the sand, with a neon sign on the roof.
        const bar = {x: Math.round(W * 0.68), w: 30};
        const hut = pixels(W, H, put => {
            const by = shore + 14;
            // Counter, lit interior between two posts, and a thatched roof.
            for (let y = 0; y < 6; y++)
                for (let x = 0; x < bar.w; x++) put(bar.x + x, by - y, silhouette);
            for (let y = 6; y < 13; y++)
                for (let x = 3; x < bar.w - 3; x++) put(bar.x + x, by - y, hex(y < 8 ? '#a85a3a' : '#5a2a3a'));
            for (const px of [1, 2, bar.w - 3, bar.w - 2]) for (let y = 6; y < 14; y++) put(bar.x + px, by - y, silhouette);
            for (let y = 0; y < 8; y++) {
                const spread = 4 + y * 1.2;
                for (let x = -spread; x < bar.w + spread; x++) {
                    if (y === 7 && Math.round(x) % 3 === 0) continue;
                    put(bar.x + x, by - 20 + y, silhouette);
                }
            }
        });
        // The sign: a neon cocktail glass beside a little sun.
        const signY = shore - 18;
        const sign: Array<[number, number, string]> = [];
        const sx = bar.x + 7;
        for (let i = 0; i <= 6; i++) sign.push([sx + i, signY - 6, '#3df2ff']);
        for (let i = 1; i < 4; i++) {
            sign.push([sx + i, signY - 6 + i, '#3df2ff']);
            sign.push([sx + 6 - i, signY - 6 + i, '#3df2ff']);
        }
        for (let i = 0; i < 3; i++) sign.push([sx + 3, signY - 2 + i, '#3df2ff']);
        for (let i = 0; i < 5; i++) sign.push([sx + 1 + i, signY + 1, '#3df2ff']);
        sign.push([sx + 6, signY - 8, '#ff4fd8'], [sx + 5, signY - 7, '#ff4fd8']);
        const ox = sx + 14, oy = signY - 3;
        for (let a = 0; a < 16; a++) {
            const x = Math.round(ox + Math.cos(a / 16 * Math.PI * 2) * 3), y = Math.round(oy + Math.sin(a / 16 * Math.PI * 2) * 3);
            if (!sign.some(p => p[0] === x && p[1] === y)) sign.push([x, y, '#ff4fd8']);
        }

        const signGlow = hut.ctx.createRadialGradient(sx + 9, signY - 3, 1, sx + 9, signY - 3, 20);
        signGlow.addColorStop(0, 'rgba(255,79,216,0.3)');
        signGlow.addColorStop(1, 'rgba(255,79,216,0)');
        // A dark board on two short legs holds the sign above the roof.
        hut.ctx.fillStyle = css(silhouette);
        hut.ctx.fillRect(sx - 3, signY - 10, 25, 14);
        hut.ctx.fillRect(sx + 1, signY + 4, 1, shore - 6 - signY - 4);
        hut.ctx.fillRect(sx + 17, signY + 4, 1, shore - 6 - signY - 4);

        // Scanlines and a soft vignette, baked once.
        const tape = pixels(W, H, put => {
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) {
                    if (y % 2 === 1) put(x, y, [0, 0, 0], 30);
                    const d = Math.hypot((x - cx) / (W / 2), (y - H / 2) / (H / 2));
                    if ((d - 0.85) * 1.5 > bayer(x, y)) put(x, y, [10, 0, 20], 150);
                }
        });

        const glints = Array.from({length: 46}, () => ({
            x: random() * W, y: horizon + 2 + Math.floor(random() * (shore - horizon - 4)),
            len: 2 + Math.floor(random() * 4), phase: random() * 6
        }));
        const birds = [0, 1].map(i => ({y: 30 + i * 9, speed: 3 + i * 1.3, off: i * 70}));

        return (ctx, t, beat) => {
            const kick = pulse(beat);
            ctx.drawImage(back.canvas, 0, 0);

            // Sun glow breathing with the beat.
            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(sun.x, sun.y, sun.r * 0.6, sun.x, sun.y, sun.r * 3);
            g.addColorStop(0, css(hex('#ff9a6a'), 0.25 + 0.08 * kick));
            g.addColorStop(1, css(hex('#ff9a6a'), 0));
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, horizon);
            ctx.globalCompositeOperation = 'source-over';

            // Gulls drifting across.
            ctx.fillStyle = css(silhouette);
            for (const b of birds) {
                const bx = Math.round(((t * b.speed + b.off) % (W + 40)) - 20);
                const flap = Math.floor(t * 3 + b.off) % 2;
                const by = b.y + Math.round(Math.sin(t * 0.7 + b.off) * 2);
                ctx.fillRect(bx, by, 1, 1);
                ctx.fillRect(bx - 1, by - flap, 1, 1);
                ctx.fillRect(bx + 1, by - flap, 1, 1);
                ctx.fillRect(bx - 2, by - 1 + flap, 1, 1);
                ctx.fillRect(bx + 2, by - 1 + flap, 1, 1);
            }

            // The sun's reflection: broken dashes that shimmer, narrowing towards the shore.
            for (let y = horizon + 1; y < shore; y++) {
                const v = (y - horizon) / (shore - horizon);
                const width = sun.r * (1.1 - v * 0.6);
                const n = 3;
                for (let k = 0; k < n; k++) {
                    const h = hash(y * 3 + k, Math.floor(t * 4 + y * 0.3));
                    const len = Math.round(2 + h * 7 * (1 - v * 0.5));
                    const x = Math.round(sun.x + (hash(k, y + Math.floor(t * 2)) - 0.5) * width * 2 - len / 2);
                    ctx.fillStyle = css(hex(v < 0.4 ? '#ffe0a0' : '#ffb07a'), 0.85 - v * 0.5);
                    ctx.fillRect(x, y, len, 1);
                }
            }
            // Glints across the water, drifting slowly.
            for (const gl of glints) {
                const a = Math.max(0, Math.sin(t * 1.3 + gl.phase));
                if (a < 0.2) continue;
                const x = Math.round((gl.x - t * 2 + W) % W);
                ctx.fillStyle = css(hex('#ff9ac8'), a * 0.5);
                ctx.fillRect(x, gl.y, gl.len, 1);
            }

            // Waves washing up the sand and sliding back.
            const wash = Math.sin(t * 0.55);
            const foamY = shore + 4 + Math.round(wash * 4);
            ctx.fillStyle = css(hex('#2e0f48'), 0.7);
            for (let x = 0; x < W; x += 2) {
                const y = foamY + Math.round(Math.sin(x * 0.09 + t * 0.8) * 1.5);
                ctx.fillRect(x, shore, 2, y - shore);
                ctx.fillStyle = css(hex('#ffd0e6'), 0.55 + 0.25 * Math.sin(x * 0.3 + t * 2));
                ctx.fillRect(x, y, 2, 1);
                ctx.fillStyle = css(hex('#2e0f48'), 0.7);
            }
            ctx.fillStyle = css(hex('#ffc0d8'), 0.35);
            for (let x = 0; x < W; x += 5) {
                const y = shore + 1 + Math.round((Math.sin(x * 0.05 - t * 1.2) + 1) * 1.2);
                ctx.fillRect(x + (Math.floor(t * 3) % 3), y, 3, 1);
            }

            ctx.drawImage(hut.canvas, 0, 0);
            // Neon sign: mostly steady, buzzing and dropping out now and then.
            const buzz = hash(Math.floor(t * 12), 5);
            const on = buzz > 0.06 && !(Math.floor(t / 7) % 3 === 1 && (t % 7) < 0.5 && buzz < 0.6);
            if (on) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = signGlow;
                ctx.globalAlpha = 0.6 + 0.4 * kick;
                ctx.fillRect(sx - 14, signY - 22, 46, 36);
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
                for (const [x, y, c] of sign) {
                    ctx.fillStyle = c;
                    ctx.fillRect(x, y, 1, 1);
                }
            } else {
                ctx.fillStyle = '#3a2048';
                for (const [x, y] of sign) ctx.fillRect(x, y, 1, 1);
            }

            // Palms, with their crowns swaying more at the frond tips.
            for (const p of palms) {
                ctx.drawImage(p.trunk.canvas, 0, 0);
                const sway = Math.sin(t * 0.6 + p.phase);
                const c = p.size / 2;
                for (let y = 0; y < p.size; y++) {
                    const dx = Math.round(sway * (1 + Math.abs(y - c) / c * 2));
                    ctx.drawImage(p.crown.canvas, 0, y, p.size, 1, p.top.x - c + dx, p.top.y - c + y, p.size, 1);
                }
            }

            ctx.drawImage(tape.canvas, 0, 0);

            // VHS: head-switching noise at the bottom, and every so often a tracking wobble.
            const src = ctx.canvas;
            for (let y = H - 3; y < H; y++) ctx.drawImage(src, 0, y, W, 1, 3 + (y % 2) * 2, y, W, 1);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            for (let i = 0; i < 12; i++) ctx.fillRect(Math.floor(hash(i, Math.floor(t * 20)) * W), H - 3 + (i % 3), 3, 1);

            const cycle = t % 13;
            if (cycle < 0.7) {
                const seed = Math.floor(t / 13);
                const y0 = Math.round(20 + hash(seed, 1) * (H - 60));
                const band = 5 + Math.round(hash(seed, 2) * 10);
                const drift = Math.round(cycle * 40);
                for (let y = y0 + drift; y < Math.min(H, y0 + drift + band); y++) {
                    const shift = Math.round((hash(y, Math.floor(t * 30)) - 0.5) * 10);
                    ctx.drawImage(src, 0, y, W, 1, shift, y, W, 1);
                }
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                for (let i = 0; i < 30; i++)
                    ctx.fillRect(Math.floor(hash(i, t * 30) * W), y0 + drift + Math.floor(hash(i + 7, t) * band), 2, 1);
            }
        };
    }
};
