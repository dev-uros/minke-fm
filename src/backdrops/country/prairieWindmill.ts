import {Backdrop, bayer, canvas, css, disc, ditherPick, hash, hex, pixels, pulse, rng, wrappingNoise} from '../pixel';

/**
 * Open prairie at sundown: a farm windmill turning against a low sun, a
 * fence line, and a wheat field where gusts roll across as bright waves while
 * the near stalks bow and spring back. The sun's glow breathes on the beat.
 */
export const PRAIRIE_WINDMILL: Backdrop = {
    id: 'country-prairie-windmill',
    name: 'Prairie windmill',
    bpm: 96,
    create(W, H) {
        const random = rng(41);
        const horizon = Math.round(H * 0.6);
        const sky = ['#2a1b46', '#4f2a5c', '#8e3d66', '#cf5f55', '#f08f52', '#f8bf6c', '#fde3a0'].map(hex);
        const field = ['#f0b660', '#cf8a42', '#a5612f', '#713d24', '#45241a'].map(hex);
        const sun = {x: Math.round(W * 0.4), y: horizon - 3, r: 15};
        const farHill = (x: number) => horizon - 5 - Math.round(3 * Math.sin(x * 0.027 + 1) + 2 * Math.sin(x * 0.071 + 4));
        const nearHill = (x: number) => horizon - 1 - Math.round(2 * Math.sin(x * 0.043 + 2.5) + Math.sin(x * 0.11));

        const back = pixels(W, H, put => {
            for (let y = 0; y < horizon; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, Math.pow(y / horizon, 1.3), x, y));
            for (let i = 0; i < 30; i++) put(random() * W, random() * horizon * 0.3, hex('#ffd9c4'), 60 + random() * 100);
            // Thin streaks of cloud lit from below.
            for (let i = 0; i < 7; i++) {
                const cy = Math.round(horizon * (0.25 + random() * 0.45));
                const cx = random() * W, len = 20 + random() * 50;
                for (let k = 0; k < len; k++) {
                    const thick = Math.sin((k / len) * Math.PI) * 3;
                    for (let j = 0; j < thick; j++) put(cx + k, cy - j, hex(j === 0 ? '#ffb27a' : '#d26a62'), 170);
                    if (k > 4 && k < len - 6) put(cx + k + 3, cy + 1, hex('#7c3a5c'), 160);
                }
            }
            const sunPal = ['#fff4cf', '#ffe2a0', '#fcc77a'].map(hex);
            disc(put, sun.x, sun.y, sun.r, (x, y) => ditherPick(sunPal, (y - sun.y + sun.r) / (2 * sun.r), x, y));
            const far = hex('#8a4766'), near = hex('#5c2f4f');
            for (let x = 0; x < W; x++) {
                for (let y = farHill(x); y < horizon + 2; y++) put(x, y, far);
                for (let y = nearHill(x); y < horizon + 2; y++) put(x, y, near);
            }
            // The field: brightest where it catches the sun near the horizon, stalk streaks for texture.
            for (let y = horizon + 1; y < H; y++) {
                const d = (y - horizon) / (H - horizon);
                for (let x = 0; x < W; x++) {
                    const glare = Math.max(0, 1 - Math.abs(x - sun.x) / (W * 0.5)) * 0.25 * (1 - d);
                    const streak = hash(x, Math.floor(y / (2 + d * 4))) < 0.3 ? 0.12 : 0;
                    put(x, y, ditherPick(field, d * 1.05 + streak - glare, x, y));
                }
            }
            // A dirt track running off towards the hills.
            for (let y = horizon + 2; y < H; y++) {
                const d = (y - horizon) / (H - horizon);
                const cx = W * 0.2 - d * W * 0.25;
                const hw = 1 + d * 7;
                for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++)
                    put(x, y, ditherPick(['#c98a5a', '#9a6248', '#6a4034'].map(hex), d, x, y));
            }
        });

        // Gust waves: a lighter copy of the field shown through scrolling noise.
        const sheen = pixels(W, H, put => {
            const c = hex('#ffd685');
            for (let y = horizon + 2; y < H; y++)
                for (let x = 0; x < W; x++) if (hash(x, Math.floor(y / 2)) < 0.65) put(x, y, c);
        });
        const noise = wrappingNoise(W, H, 22, random);
        const mask = pixels(W, H, put => {
            const c = hex('#ffffff');
            for (let y = horizon + 2; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const v = noise(x * 2, y * 0.6 + 40);
                    if (v > 0.58 + bayer(x, y) * 0.22) put(x, y, c);
                }
            }
        });
        const gust = canvas(W, H);

        // Windmill, tower and fence are static silhouettes.
        const wx = Math.round(W * 0.66), yb = horizon + 9, yt = yb - 54;
        const hub = {x: wx, y: yt - 3};
        const dark = '#2a1428';
        const props = canvas(W, H);
        const pc = props.ctx;
        pc.fillStyle = dark;
        for (let y = yt; y <= yb; y++) {
            const hw = Math.round(1 + ((y - yt) / (yb - yt)) * 6);
            pc.fillRect(wx - hw, y, 1, 1);
            pc.fillRect(wx + hw, y, 1, 1);
        }
        for (let y0 = yt + 6; y0 < yb - 4; y0 += 10) {
            const y1 = y0 + 10;
            for (let k = 0; k <= 10; k++) {
                const y = y0 + k;
                const hw = 1 + ((y - yt) / (yb - yt)) * 6;
                const f = k / 10;
                pc.fillRect(Math.round(wx - hw + f * hw * 2), y, 1, 1);
                pc.fillRect(Math.round(wx + hw - f * hw * 2), y, 1, 1);
            }
            pc.fillRect(Math.round(wx - (1 + ((y1 - yt) / (yb - yt)) * 6)), y1, Math.round(2 * (1 + ((y1 - yt) / (yb - yt)) * 6)) + 1, 1);
        }
        pc.fillRect(wx - 3, yt, 7, 2);
        pc.fillRect(wx, yt - 3, 1, 3);
        // Tail vane behind the wheel.
        pc.fillRect(wx + 2, hub.y, 13, 1);
        pc.fillRect(wx + 12, hub.y - 4, 4, 8);
        pc.fillStyle = '#7a3d4a';
        pc.fillRect(wx + 15, hub.y - 4, 1, 8);
        // A stock tank at the foot of the tower.
        pc.fillStyle = dark;
        pc.fillRect(wx + 9, yb - 4, 14, 5);
        pc.fillStyle = '#f2a65a';
        pc.fillRect(wx + 9, yb - 4, 14, 1);
        // Fence across the field.
        const fy = horizon + 24;
        for (let x = -3; x < W + 14; x += 15) {
            pc.fillStyle = dark;
            pc.fillRect(x, fy - 11, 2, 12);
            pc.fillStyle = '#e8955a';
            pc.fillRect(x, fy - 11, 1, 1);
        }
        pc.fillStyle = dark;
        for (let x = 0; x < W; x++) {
            pc.fillRect(x, fy - 9 + Math.round(Math.sin((x % 15) / 15 * Math.PI) * 1), 1, 1);
            pc.fillRect(x, fy - 5 + Math.round(Math.sin((x % 15) / 15 * Math.PI) * 1), 1, 1);
        }

        // Near stalks drawn per frame so they can bend.
        const stalks = Array.from({length: Math.ceil(W / 3) + 2}, (_, i) => ({
            x: i * 3 - 3 + Math.floor(random() * 3),
            h: 12 + Math.floor(random() * 18),
            ph: random() * 6
        }));
        const birds = Array.from({length: 4}, (_, i) => ({
            seed: random() * W, y: 26 + i * 7 + random() * 6, speed: 4 + random() * 3, flap: random() * 4
        }));

        const glow = pc.createRadialGradient(sun.x, sun.y, 2, sun.x, sun.y, W * 0.5);
        glow.addColorStop(0, 'rgba(255,190,120,1)');
        glow.addColorStop(1, 'rgba(255,190,120,0)');
        const rimLight = hex('#f6b06a');

        return (ctx, t, beat) => {
            ctx.drawImage(back.canvas, 0, 0);

            // Gust waves roll left to right across the field.
            const off = Math.floor(t * 14) % W;
            gust.ctx.globalCompositeOperation = 'source-over';
            gust.ctx.clearRect(0, 0, W, H);
            gust.ctx.drawImage(mask.canvas, off, 0);
            gust.ctx.drawImage(mask.canvas, off - W, 0);
            gust.ctx.globalCompositeOperation = 'source-in';
            gust.ctx.drawImage(sheen.canvas, 0, 0);
            ctx.globalAlpha = 0.28;
            ctx.drawImage(gust.canvas, 0, 0);
            ctx.globalAlpha = 1;

            ctx.drawImage(props.canvas, 0, 0);

            // The wheel: fourteen blades, turning steadily, a little faster in gusts.
            const rot = t * 0.9 + Math.sin(t * 0.3) * 0.6;
            ctx.fillStyle = dark;
            for (let j = 0; j < 14; j++) {
                const a = rot + (j * Math.PI * 2) / 14;
                const c = Math.cos(a), s = Math.sin(a);
                for (let r = 3; r <= 15; r++) {
                    ctx.fillRect(Math.round(hub.x + c * r), Math.round(hub.y + s * r), 1, 1);
                    if (r > 7) ctx.fillRect(Math.round(hub.x + Math.cos(a + 0.1) * r), Math.round(hub.y + Math.sin(a + 0.1) * r), 1, 1);
                }
            }
            ctx.fillRect(hub.x - 1, hub.y - 1, 3, 3);

            // Birds heading home.
            ctx.fillStyle = '#3a1e3a';
            for (const b of birds) {
                const x = Math.round(((b.seed + t * b.speed) % (W + 20)) - 10);
                const y = Math.round(b.y + Math.sin(t * 0.7 + b.flap) * 2);
                const up = Math.floor(t * 4 + b.flap) % 2 === 0;
                ctx.fillRect(x, y, 1, 1);
                ctx.fillRect(x - 2, y - (up ? 1 : 0), 2, 1);
                ctx.fillRect(x + 1, y - (up ? 1 : 0), 2, 1);
            }

            // Near wheat bows with the same travelling wave as the gusts.
            for (const s of stalks) {
                const lean = Math.sin(s.x * 0.045 - t * 1.6) * 2.2 + Math.sin(s.x * 0.13 - t * 2.4 + s.ph) * 0.8 + 1.2;
                const base = H;
                const seg = s.h / 3;
                ctx.fillStyle = '#3b1f1c';
                for (let k = 0; k < 3; k++) {
                    const f = (k + 1) / 3;
                    ctx.fillRect(Math.round(s.x + lean * f * f), Math.round(base - seg * (k + 1)), 1, Math.ceil(seg) + 1);
                }
                const hx = Math.round(s.x + lean * 1.15), hy = Math.round(base - s.h - 5);
                ctx.fillStyle = '#6e3b26';
                ctx.fillRect(hx - 1, hy, 2, 6);
                ctx.fillStyle = css(rimLight, 0.9);
                ctx.fillRect(hx, hy, 1, 4);
                ctx.fillRect(hx - 1, hy - 2, 1, 2);
            }

            // The low sun warms everything a little on the beat.
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.1 + 0.05 * pulse(beat);
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        };
    }
};
