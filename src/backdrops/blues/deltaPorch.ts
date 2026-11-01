import {Backdrop, css, disc, ditherPick, hex, pixels, pulse, RGB, rng} from '../pixel';

/**
 * A porch in the delta at dusk: the sun sinks into a cotton field behind the
 * railing, heat haze wobbles the horizon, fireflies blink on, a rocking chair
 * rocks on the beat and an old acoustic guitar leans on the post.
 */
export const DELTA_PORCH: Backdrop = {
    id: 'blues-delta-porch',
    name: 'Delta porch',
    bpm: 70,
    create(W, H) {
        const random = rng(91);
        const cx = Math.round(W / 2);
        const horizon = 106, floorY = 136;
        const postL = cx - Math.round(W * 0.42), postR = cx + Math.round(W * 0.38);
        const sun = {x: cx + Math.round(W * 0.14), y: horizon - 3, r: 13};

        const sky = ['#1a1533', '#2c1f48', '#4a2a5a', '#7a3858', '#b24e4c', '#de7040', '#f79a46', '#ffc56e'].map(hex);
        const sunPal = ['#ffd27a', '#ffe9a8', '#fff6d6'].map(hex);
        const field = ['#0e0a12', '#1b1219', '#2c1b1c', '#45291f', '#6a3c24', '#9a5a2e'].map(hex);
        const tree = hex('#1f1226');
        const boards = ['#0f0a0c', '#1e1414', '#30201b', '#4a3022', '#6a442c', '#8e5e38'].map(hex);

        // Sky, sun, treeline and field: everything beyond the railing.
        const far = pixels(W, floorY, put => {
            for (let y = 0; y < horizon; y++)
                for (let x = 0; x < W; x++) {
                    const near = Math.max(0, 1 - Math.hypot(x - sun.x, (y - sun.y) * 2) / 140);
                    put(x, y, ditherPick(sky, y / horizon + near * 0.25, x, y));
                }
            // Thin clouds lit from below.
            for (let i = 0; i < 6; i++) {
                const cy = 30 + Math.floor(random() * 50), x0 = Math.floor(random() * W), len = 30 + Math.floor(random() * 60);
                for (let x = x0; x < x0 + len; x++) {
                    put(x % W, cy, hex('#d8705a'), 150);
                    if (x > x0 + 4 && x < x0 + len - 6) put(x % W, cy + 1, hex('#5a2a4a'), 160);
                }
            }
            disc(put, sun.x, sun.y, sun.r, (x, y) => ditherPick(sunPal, 1 - Math.hypot(x - sun.x, y - sun.y) / sun.r, x, y));
            // Treeline, with one big mossy oak.
            for (let x = 0; x < W; x++) {
                const h = 2 + Math.round(2 * Math.sin(x * 0.2) + 1.5 * Math.sin(x * 0.07 + 1) + random() * 1.5);
                for (let y = horizon - h; y < horizon; y++) put(x, y, tree);
            }
            const oak = cx - Math.round(W * 0.22);
            for (let y = horizon - 22; y < horizon; y++) {
                put(oak, y, tree);
                put(oak + 1, y, tree);
            }
            for (let i = 0; i < 900; i++) {
                const a = random() * Math.PI, r = Math.sqrt(random());
                const x = oak + Math.cos(a) * r * 26, y = horizon - 20 - Math.sin(a) * r * 13 + Math.abs(Math.cos(a)) * 3;
                put(x, y, tree);
            }
            for (let i = 0; i < 6; i++) for (let k = 0; k < 6; k++) put(oak + Math.round((i - 2.5) * 3 + k * (i - 2.5) * 0.4), horizon - 20 + Math.round(k * 0.6), tree);
            for (let i = 0; i < 18; i++) {
                const x = oak - 22 + Math.floor(random() * 44), len = 3 + Math.floor(random() * 7);
                for (let k = 0; k < len; k++) put(x, horizon - 18 + k, tree);
            }
            // A far shed and telegraph poles.
            const shed = cx + Math.round(W * 0.33);
            for (let y = horizon - 7; y < horizon; y++) for (let x = shed; x < shed + 9; x++) put(x, y, tree);
            for (let x = shed - 1; x < shed + 10; x++) put(x, horizon - 8 - Math.max(0, 4 - Math.abs(x - shed - 4)), tree);
            for (let i = 0; i < 5; i++) {
                const px = Math.round(W * (0.04 + i * 0.12)), ph = 16 - i * 2;
                for (let y = horizon - ph; y < horizon; y++) put(px, y, tree);
                for (let x = px - 2; x <= px + 2; x++) put(x, horizon - ph + 1, tree);
            }
            // Cotton field in rows, rim-lit by the low sun.
            for (let y = horizon; y < floorY; y++) {
                const d = (y - horizon) / (floorY - horizon);
                for (let x = 0; x < W; x++) {
                    const row = Math.sin((x - sun.x) * (0.9 - d * 0.5) / (0.3 + d) + y * 1.7) > 0.3;
                    const glow = Math.max(0, 1 - Math.abs(x - sun.x) / (W * 0.5)) * (1 - d);
                    const v = 0.15 + glow * 0.5 + (row ? 0.12 : 0);
                    put(x, y, ditherPick(field, v, x, y));
                    if (row && ((x * 7 + y * 13) % (37 - Math.floor(d * 14)) === 0)) put(x, y, hex('#d8b8a0'), 50 + Math.floor(d * 70));
                }
            }
        });

        // Roof, posts, railing and floor boards in front.
        const porch = pixels(W, H, put => {
            const dark = (x: number, y: number, v: number) => ditherPick(boards, v, x, y);
            for (let y = 0; y < 12; y++)
                for (let x = 0; x < W; x++) put(x, y, dark(x, y, y >= 9 ? 0.32 : y % 3 === 0 ? 0.04 : 0.12));
            for (const px of [postL, postR]) {
                for (let y = 12; y < floorY; y++)
                    for (let x = px - 3; x <= px + 3; x++) put(x, y, dark(x, y, x === px + 3 ? 0.5 : x === px - 3 ? 0.05 : 0.2));
            }
            for (let x = 0; x < W; x++) {
                for (let y = 113; y < 116; y++) put(x, y, dark(x, y, y === 113 ? 0.55 : 0.18));
                for (let y = 130; y < 132; y++) put(x, y, dark(x, y, 0.15));
                if (x % 9 < 2) for (let y = 116; y < 130; y++) put(x, y, dark(x, y, x % 9 === 1 ? 0.3 : 0.08));
            }
            for (let y = floorY; y < H; y++) {
                const plank = Math.floor((y - floorY) / (3 + (y - floorY) * 0.08));
                for (let x = 0; x < W; x++) {
                    const lit = Math.max(0, 1 - Math.abs(x - sun.x) / W) * 0.25;
                    let v = 0.2 + lit + (plank % 2) * 0.05 - (y - floorY) / 200;
                    if ((x + plank * 37) % 53 === 0) v -= 0.12;
                    put(x, y, dark(x, y, y === floorY ? 0.55 : v));
                }
            }
            // The guitar leaning against the right post.
            const gb = {x: postR - 27, y: floorY + 12}, th = 0.3;
            const wood = ['#3a1c0c', '#7a4418', '#b8742c', '#e0a050', '#f6cc84'].map(hex);
            const axis = (x: number, y: number) => {
                const dx = x - gb.x, dy = y - gb.y;
                return {s: dx * Math.sin(th) - dy * Math.cos(th), u: dx * Math.cos(th) + dy * Math.sin(th)};
            };
            const body = (x: number, y: number) => {
                const {s, u} = axis(x, y);
                return Math.hypot(s - 11, u) <= 11 || Math.hypot(s - 27, u) <= 8.5 || (s > 11 && s < 27 && Math.abs(u) <= 7);
            };
            for (let y = gb.y - 70; y <= gb.y + 2; y++) {
                for (let x = gb.x - 16; x <= gb.x + 32; x++) {
                    const {s, u} = axis(x, y);
                    if (body(x, y)) {
                        const edge = !body(x - 1, y) || !body(x + 1, y) || !body(x, y - 1) || !body(x, y + 1);
                        let c = ditherPick(wood, 0.45 + (u / 11) * 0.35, x, y);
                        if (edge) c = wood[0];
                        else if (Math.hypot(s - 23, u) <= 3.2) c = hex('#120806');
                        else if (Math.abs(s - 7) < 1 && Math.abs(u) < 4) c = hex('#1a0c06');
                        else if (Math.abs(u) < 0.5 && s > 7 && s < 20) c = wood[4];
                        put(x, y, c);
                    } else if (s >= 35 && s < 58 && Math.abs(u) <= 1.6) {
                        put(x, y, u > 0.3 ? hex('#5a3216') : hex('#2a1408'));
                    } else if (s >= 58 && s < 66 && Math.abs(u) <= 2.5) {
                        put(x, y, (Math.round(s) % 3 === 0 && Math.abs(u) > 1.6) ? hex('#d8c08a') : wood[0]);
                    }
                }
            }
        });

        // The rocking chair, as a small indexed sprite we rotate per frame.
        const SW = 50, SH = 66;
        const chairPal: RGB[] = ['#140a0a', '#3a2016', '#6a3c22', '#a8643a', '#9a2a26', '#d0503a'].map(hex);
        const sprite = new Int8Array(SW * SH).fill(-1);
        const set = (x: number, y: number, c: number) => {
            x = Math.round(x);
            y = Math.round(y);
            if (x >= 0 && y >= 0 && x < SW && y < SH) sprite[y * SW + x] = c;
        };
        // A thick wooden bar, lit along its top or right edge by the sunset.
        const bar = (x0: number, y0: number, x1: number, y1: number, w: number) => {
            const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
            const vertical = Math.abs(y1 - y0) > Math.abs(x1 - x0);
            for (let i = 0; i <= n; i++) {
                const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
                for (let k = 0; k < w; k++) {
                    const c = k === w - 1 ? 3 : k === 0 ? 0 : 1;
                    if (vertical) set(x - Math.floor(w / 2) + k, y, c);
                    else set(x, y + Math.floor(w / 2) - k, c === 3 ? 0 : c === 0 ? 3 : 1);
                }
            }
        };
        bar(16, 60, 16, 38, 3);
        bar(36, 60, 35, 38, 3);
        bar(36, 40, 35, 25, 2);
        bar(16, 38, 6, 2, 3);
        bar(5, 18, 40, 24, 3);
        bar(12, 38, 40, 38, 3);
        for (let x = 4; x <= 46; x++) {
            const y = 61 - Math.round(Math.pow((x - 25) / 21, 2) * 6);
            set(x, y + 1, 0);
            set(x, y, 2);
            set(x, y - 1, 3);
        }
        for (let x = 17; x <= 37; x++) {
            set(x, 35, 4);
            set(x, 34, x % 4 === 0 ? 4 : 5);
        }
        for (let x = 4; x <= 8; x++) set(x, 1, 3);
        set(6, 0, 3);
        // A folded blanket hanging over the back.
        for (let y = 8; y < 22; y++) for (let x = 6 + Math.floor((22 - y) * 0.25); x < 10 + Math.floor((22 - y) * 0.25); x++)
            set(x, y, (x + y) % 3 === 0 ? 5 : 4);
        const chair = {x: cx - Math.round(W * 0.1), y: floorY + 16};
        const pivot = {x: 25, y: 61};

        const flies = Array.from({length: 44}, () => ({
            x: random() * W, y: horizon - 6 + random() * 50, ph: random() * 20, rate: 0.6 + random() * 0.8,
            wx: 4 + random() * 10, wy: 2 + random() * 5
        }));
        const glow: RGB = hex('#d8ff6a');
        const sunGlow: RGB = hex('#ffb060');

        return (ctx, t, beat) => {
            const breath = pulse(beat);
            ctx.drawImage(far.canvas, 0, 0);

            // Heat haze: the band around the horizon wobbles a pixel.
            for (let y = horizon - 16; y < horizon + 8; y++) {
                const dx = Math.round(Math.sin(y * 0.9 + t * 2.4) * Math.sin(t * 0.7 + y * 0.1) * 1.2);
                if (dx !== 0) ctx.drawImage(far.canvas, 0, y, W, 1, dx, y, W, 1);
            }

            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(sun.x, sun.y, 4, sun.x, sun.y, 90);
            g.addColorStop(0, css(sunGlow, 0.22 + 0.08 * breath));
            g.addColorStop(1, css(sunGlow, 0));
            ctx.fillStyle = g;
            ctx.fillRect(sun.x - 90, sun.y - 90, 180, 180);
            ctx.globalCompositeOperation = 'source-over';

            // Distant fireflies sit behind the railing.
            const drawFly = (f: typeof flies[number]) => {
                const b = Math.pow(Math.max(0, Math.sin(t * f.rate + f.ph)), 4);
                if (b < 0.05) return;
                const x = Math.round(f.x + Math.sin(t * 0.3 + f.ph) * f.wx), y = Math.round(f.y + Math.sin(t * 0.45 + f.ph * 2) * f.wy);
                ctx.fillStyle = css(glow, 0.14 * b);
                ctx.fillRect(x - 2, y - 1, 5, 3);
                ctx.fillRect(x - 1, y - 2, 3, 5);
                ctx.fillStyle = css(glow, 0.5 * b);
                ctx.fillRect(x - 1, y, 3, 1);
                ctx.fillRect(x, y - 1, 1, 3);
                ctx.fillStyle = css(hex('#fbffd0'), b);
                ctx.fillRect(x, y, 1, 1);
            };
            for (const f of flies) if (f.y < floorY - 6) drawFly(f);

            ctx.drawImage(porch.canvas, 0, 0);

            // The chair rocks once every two beats.
            const angle = Math.sin(beat * Math.PI) * 0.09;
            const cos = Math.cos(angle), sin = Math.sin(angle);
            const roll = angle * 30;
            for (let y = -66; y <= 4; y++) {
                for (let x = -30; x <= 30; x++) {
                    const sx = Math.round(cos * x + sin * y + pivot.x - roll * 0.2);
                    const sy = Math.round(-sin * x + cos * y + pivot.y);
                    if (sx < 0 || sy < 0 || sx >= SW || sy >= SH) continue;
                    const c = sprite[sy * SW + sx];
                    if (c < 0) continue;
                    ctx.fillStyle = css(chairPal[c]);
                    ctx.fillRect(chair.x + x, chair.y + y, 1, 1);
                }
            }

            for (const f of flies) if (f.y >= floorY - 6) drawFly(f);
        };
    }
};
