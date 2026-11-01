import {Backdrop, bayer, css, hash, hex, pixels, pulse, RGB, rng} from '../pixel';

interface Scheme {
    bg: RGB;
    glow: RGB;
    rings: RGB[];
}

/**
 * A music visualiser: a curving tunnel of pixel squares rushing at the viewer,
 * one ring passing per beat, with a spectrum flower pulsing at the far end and
 * sparks streaking by. Colours and ring style change every 8 bars.
 */
export const TUNNEL: Backdrop = {
    id: 'electronic-tunnel',
    name: 'Visualiser tunnel',
    bpm: 128,
    create(W, H) {
        const random = rng(77);
        const schemes: Scheme[] = [
            {bg: hex('#04020c'), glow: hex('#3a0a6a'), rings: ['#ff2a6d', '#ff8a3d', '#ffd23f', '#7b2fff'].map(hex)},
            {bg: hex('#010a0c'), glow: hex('#063a4a'), rings: ['#05d9e8', '#39ff14', '#0a84ff', '#b8fff2'].map(hex)},
            {bg: hex('#0a0208'), glow: hex('#4a0636'), rings: ['#ff6ec7', '#ff2a2a', '#ffb3e6', '#9a1aff'].map(hex)},
            {bg: hex('#06060a'), glow: hex('#2a2a10'), rings: ['#f9f871', '#ffffff', '#7df9ff', '#ff9f1c'].map(hex)}
        ];
        const N = 26, SPACING = 0.32, K = H * 0.2;

        // Ordered-dither vignette so the edges fall off in pixel steps.
        const vignette = pixels(W, H, put => {
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) {
                    const d = Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2));
                    if ((d - 0.75) * 1.6 > bayer(x, y)) put(x, y, [0, 0, 0], 200);
                }
        });

        const sparks = Array.from({length: 60}, () => ({
            a: random() * Math.PI * 2,
            r: 0.5 + random() * 0.9,
            z: random() * N * SPACING,
            speed: 3 + random() * 4
        }));

        // Where the tunnel's centre sits at depth z: it bends slowly.
        const centre = (z: number, t: number) => {
            const bend = Math.min(1, z / 3);
            return {
                x: W / 2 + Math.sin(t * 0.45 + z * 0.12) * W * 0.14 * bend,
                y: H / 2 + Math.cos(t * 0.33 + z * 0.1) * H * 0.12 * bend
            };
        };

        let last = 0;

        return (ctx, t, beat) => {
            const dt = Math.min(0.1, Math.max(0, t - last));
            last = t;
            const kick = pulse(beat);
            const section = Math.floor(beat / 32);
            const s = schemes[section % schemes.length];
            const mode = section % 3;

            ctx.fillStyle = css(s.bg);
            ctx.fillRect(0, 0, W, H);
            const far = centre(N * SPACING, t);
            const g = ctx.createRadialGradient(far.x, far.y, 1, far.x, far.y, H * 0.7);
            g.addColorStop(0, css(s.glow, 0.9));
            g.addColorStop(1, css(s.glow, 0));
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);

            // Rings from far to near, so near ones paint over.
            const travel = beat * 2, f = travel - Math.floor(travel);

            // Four rails joining the ring corners give the tunnel its walls.
            ctx.fillStyle = css(s.rings[0], 0.22);
            let prev: Array<[number, number]> | null = null;
            for (let i = N - 1; i >= 0; i--) {
                const z = (i + 1 - f) * SPACING;
                const half = K / z, c = centre(z, t);
                if (half > W) break;
                const pts: Array<[number, number]> = [[c.x - half, c.y - half * 0.8], [c.x + half, c.y - half * 0.8],
                    [c.x - half, c.y + half * 0.8], [c.x + half, c.y + half * 0.8]];
                if (prev) {
                    for (let k = 0; k < 4; k++) {
                        const [ax, ay] = prev[k], [bx, by] = pts[k];
                        const n = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)));
                        for (let j = 0; j < n; j += 2) {
                            const x = Math.round(ax + (bx - ax) * j / n), y = Math.round(ay + (by - ay) * j / n);
                            if (x >= 0 && x < W && y >= 0 && y < H) ctx.fillRect(x, y, 1, 1);
                        }
                    }
                }
                prev = pts;
            }
            for (let i = N - 1; i >= 0; i--) {
                const z = (i + 1 - f) * SPACING;
                const half = Math.round(K / z);
                if (half > W) continue;
                const id = Math.floor(travel) + i;
                const c = centre(z, t);
                const fog = Math.max(0, Math.min(1, 1.25 - z / (N * SPACING)));
                const bar = id % 16 === 0;
                const colour = bar ? hex('#ffffff') : s.rings[id % s.rings.length];
                const th = Math.max(1, Math.round(1.2 / z + (i < 2 ? kick * 2 : 0)));
                ctx.fillStyle = css(colour, fog * (bar ? 0.9 : 0.75 + 0.25 * kick));
                const x0 = Math.round(c.x - half), y0 = Math.round(c.y - half * 0.8);
                const w = half * 2, h = Math.round(half * 1.6);
                if (mode === 0) {
                    ctx.fillRect(x0, y0, w, th);
                    ctx.fillRect(x0, y0 + h - th, w, th);
                    ctx.fillRect(x0, y0, th, h);
                    ctx.fillRect(x0 + w - th, y0, th, h);
                } else if (mode === 1) {
                    // Dashed: segments march round the ring.
                    const seg = Math.max(3, Math.round(half / 5)), shift = Math.floor(t * 8) % (seg * 2);
                    for (let x = -shift; x < w; x += seg * 2) {
                        const a = Math.max(0, x), b = Math.min(w, x + seg);
                        if (b > a) {
                            ctx.fillRect(x0 + a, y0, b - a, th);
                            ctx.fillRect(x0 + w - b, y0 + h - th, b - a, th);
                        }
                    }
                    for (let y = -shift; y < h; y += seg * 2) {
                        const a = Math.max(0, y), b = Math.min(h, y + seg);
                        if (b > a) {
                            ctx.fillRect(x0 + w - th, y0 + a, th, b - a);
                            ctx.fillRect(x0, y0 + h - b, th, b - a);
                        }
                    }
                } else {
                    // Corner brackets only.
                    const arm = Math.max(2, Math.round(half * 0.35));
                    for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [x0 + w, y0, -1, 1], [x0, y0 + h, 1, -1], [x0 + w, y0 + h, -1, -1]]) {
                        ctx.fillRect(sx > 0 ? cx : cx - arm, sy > 0 ? cy : cy - th, arm, th);
                        ctx.fillRect(sx > 0 ? cx : cx - th, sy > 0 ? cy : cy - arm, th, arm);
                    }
                }
            }

            // Spectrum flower at the vanishing point.
            ctx.globalCompositeOperation = 'lighter';
            const bars = 24;
            for (let b = 0; b < bars; b++) {
                const a = (b / bars) * Math.PI * 2 + t * 0.2;
                const band = Math.min(b, bars - b) / (bars / 2);
                const level = (0.35 + 0.65 * hash(b, Math.floor(beat * 4))) * (1 - band * 0.5) * (0.4 + 0.6 * kick);
                const len = Math.round(2 + level * 12);
                ctx.fillStyle = css(s.rings[b % 2], 0.85);
                for (let k = 0; k < len; k++) {
                    const r = 5 + k;
                    ctx.fillRect(Math.round(far.x + Math.cos(a) * r), Math.round(far.y + Math.sin(a) * r), 1, 1);
                }
            }
            ctx.fillStyle = css(hex('#ffffff'), 0.5 + 0.5 * kick);
            ctx.fillRect(Math.round(far.x) - 1, Math.round(far.y) - 1, 3, 3);

            // Sparks streaking past.
            for (const p of sparks) {
                p.z -= p.speed * dt;
                if (p.z < 0.3) {
                    p.z = N * SPACING;
                    p.a = random() * Math.PI * 2;
                }
                const c = centre(p.z, t);
                const fog = Math.max(0, Math.min(1, 1.2 - p.z / (N * SPACING)));
                ctx.fillStyle = css(s.rings[3], 0.8 * fog);
                for (let k = 0; k < 3; k++) {
                    const z = p.z + k * 0.08;
                    const r = (K * p.r) / z;
                    ctx.fillRect(Math.round(c.x + Math.cos(p.a) * r), Math.round(c.y + Math.sin(p.a) * r * 0.8), 1, 1);
                }
            }
            ctx.globalCompositeOperation = 'source-over';

            ctx.drawImage(vignette.canvas, 0, 0);

            // A flash on the downbeat of each new section.
            if (beat % 32 < 1) {
                ctx.fillStyle = `rgba(255,255,255,${(0.22 * kick).toFixed(3)})`;
                ctx.fillRect(0, 0, W, H);
            }
        };
    }
};
