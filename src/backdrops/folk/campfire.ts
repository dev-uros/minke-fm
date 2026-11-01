import {Backdrop, bayer, canvas, hash, hex, pixels, pulse, RGB, rng} from '../pixel';

/**
 * A campfire in a forest clearing at night: flames licking up from crossed
 * logs, sparks drifting into a gap of stars in the canopy, firelight
 * flickering on the trunks, a small tent, and an acoustic guitar resting
 * against a log seat. The fire flares softly on the beat.
 */
export const CAMPFIRE: Backdrop = {
    id: 'folk-campfire',
    name: 'Campfire clearing',
    bpm: 80,
    create(W, H) {
        const random = rng(88);
        const ground = Math.round(H * 0.68);
        const fire = {x: Math.round(W / 2), y: Math.round(H * 0.82)};

        // Sky seen through the gap in the canopy.
        const sky = pixels(W, H, put => {
            for (let y = 0; y < ground; y++)
                for (let x = 0; x < W; x++) put(x, y, (y + x) % 2 && y > 50 ? hex('#0e1626') : hex('#0b1220'));
            for (let i = 0; i < 70; i++) put(random() * W, random() * 70, hex('#d8e0ff'), 80 + random() * 170);
        });

        // Albedo of everything around the fire; the lighting is applied below.
        const scene = canvas(W, H);
        const s = scene.ctx;
        const rect = (c: string, x: number, y: number, w: number, h: number) => {
            s.fillStyle = c;
            s.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
        };
        // Murky forest depth behind the trunks, darker towards the sides.
        rect('#0e1814', 0, 60, W, ground - 60);
        for (let y = 26; y < 60; y++)
            for (let x = 0; x < W; x++) if ((y - 26) / 34 > bayer(x, y)) rect('#0e1814', x, y, 1, 1);
        // Far trunks.
        for (let i = 0; i < 18; i++) {
            const x = random() * W, w = 2 + Math.floor(random() * 2);
            rect('#4a5246', x, 10, w, ground - 8);
        }
        // Mid trunks.
        for (let i = 0; i < 7; i++) {
            const x = (i + 0.5) / 7 * W + (random() - 0.5) * 20;
            if (Math.abs(x - fire.x) < 22) continue;
            const w = 5 + Math.floor(random() * 3);
            rect('#7a5e48', x, 0, w, ground + 4);
            rect('#96765a', x + w - 2, 0, 1, ground + 4);
            rect('#46362a', x - 1, ground + 2, w + 2, 2);
        }
        // Ground: earth, a trodden clearing round the fire, grass at the edges.
        for (let y = ground; y < H; y++)
            for (let x = 0; x < W; x++) {
                const d = Math.hypot((x - fire.x) / 2.2, y - fire.y);
                const c = d < 26 + bayer(x, y) * 8 ? '#7a6044' : hash(x, y) < 0.35 ? '#486434' : '#5c4a34';
                rect(c, x, y, 1, 1);
            }
        // Undergrowth along the edge of the clearing.
        for (let x = 0; x < W; x++) {
            const h = 3 + Math.sin(x * 0.21) * 2 + Math.sin(x * 0.53 + 1) * 2 - Math.exp(-Math.pow((x - fire.x) / 30, 2)) * 6;
            for (let y = ground + 2 - Math.round(h); y < ground + 2; y++) rect(hash(x, y) < 0.3 ? '#3e5e36' : '#2c4628', x, y, 1, 1);
        }
        // Canopy: leafy mass across the top with a ragged gap over the fire.
        for (let x = 0; x < W; x++) {
            const gap = Math.exp(-Math.pow((x - fire.x) / (W * 0.2), 2));
            const bottom = 26 + Math.sin(x * 0.2) * 3 + Math.sin(x * 0.07) * 6 - gap * 26;
            for (let y = 0; y < bottom; y++) {
                if (y > bottom - 4 && hash(x, y) < 0.5) continue;
                rect(hash(x >> 1, y >> 1) < 0.3 ? '#38583a' : '#2a442e', x, y, 1, 1);
            }
            // Hanging leaf clumps.
            if (hash(x, 3) < 0.08 && bottom > 6) rect('#2a442e', x - 2, bottom - 2, 5, 4);
        }
        // Near trunks framing the scene.
        for (const [fx, w] of [[0.06, 15], [0.94, 17]] as const) {
            const x = Math.round(W * fx - w / 2);
            rect('#6a4e3a', x, 0, w, H);
            for (let y = 0; y < H; y += 3)
                rect('#523c2c', x + Math.floor(hash(x, y) * w), y, 1, 2 + Math.floor(hash(y, x) * 3));
            rect('#86664c', fx < 0.5 ? x + w - 2 : x + 1, 0, 1, H);
        }
        // A small tent on the left, its door facing the fire.
        const tx = Math.round(fire.x - W * 0.26), tb = Math.round(fire.y - 4);
        for (let k = 0; k < 20; k++) {
            const hw = Math.round(k * 0.95);
            rect(k > 15 ? '#8a7a56' : '#a8946a', tx - hw, tb - 20 + k, hw * 2 + 1, 1);
            rect('#3a2c20', tx + Math.max(0, Math.round(hw * 0.2)), tb - 20 + k, k > 6 ? Math.round(hw * 0.5) : 0, 1);
        }
        rect('#6a5a40', tx, tb - 22, 1, 3);
        // Log seat to the right of the fire.
        const lx = fire.x + 20, lw = Math.round(Math.min(34, W * 0.12)), ly = fire.y - 2;
        rect('#6e4a2e', lx, ly, lw, 7);
        rect('#8a6040', lx, ly, lw, 1);
        rect('#4e341f', lx, ly + 6, lw, 1);
        rect('#c69a68', lx + lw, ly, 2, 7);
        rect('#a07850', lx + lw + 1, ly + 2, 1, 3);
        // Acoustic guitar leaning against the log.
        const gx = lx + Math.round(lw * 0.55), gb = fire.y + 9;
        const lean = 0.42;
        const body: Array<[number, number]> = [[4.5, 7], [13.5, 5.4]];
        for (let y = gb - 30; y <= gb; y++) {
            const up = gb - y;
            const cx = gx - up * lean;
            let hw = 0;
            for (const [cy, r] of body) {
                const d = up - cy;
                if (Math.abs(d) <= r) hw = Math.max(hw, Math.sqrt(r * r - d * d) * 1.05);
            }
            if (hw > 0) {
                rect('#7a3e1c', cx - hw - 0.5, y, hw * 2 + 1, 1);
                rect('#d9954c', cx - hw + 0.5, y, hw * 2 - 1, 1);
                rect('#efb874', cx + hw - 2, y, 1, 1);
            }
        }
        // Sound hole and bridge.
        const hole = {x: gx - 11 * lean, y: gb - 11};
        rect('#2a1608', hole.x - 1, hole.y - 1, 3, 3);
        rect('#3a1e0c', gx - 3 * lean - 2, gb - 3, 5, 1);
        // Neck and headstock, with a hint of strings.
        for (let up = 18; up < 42; up++) {
            const cx = Math.round(gx - up * lean);
            rect(up > 37 ? '#3e2412' : '#6a3a1e', cx - 1, gb - up, 2, 1);
        }
        for (let up = 3; up < 38; up++) rect('rgba(240,230,200,0.6)', Math.round(gx - up * lean), gb - up, 1, 1);
        // Stone ring and crossed logs under the fire.
        for (let i = 0; i < 9; i++) {
            const a = Math.PI * (i / 8);
            const x = fire.x + Math.cos(a) * 13, y = fire.y + 4 - Math.sin(a) * 2 + (i % 2);
            rect('#8c867a', x - 2, y, 4, 3);
            rect('#aaa496', x - 2, y, 3, 1);
        }
        for (let i = -8; i <= 8; i++) {
            rect('#4a2c18', fire.x + i - 1, fire.y + 2 - Math.round(i * 0.25), 3, 2);
            rect('#3a2214', fire.x + i - 1, fire.y + 2 + Math.round(i * 0.25), 3, 2);
        }

        // Two lightings of the same scene; the frame cross-fades between them to flicker.
        const src = s.getImageData(0, 0, W, H).data;
        const warm: RGB = [90, 34, 0];
        const lit = (strength: number, ambient: number) => pixels(W, H, put => {
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const i = (y * W + x) * 4;
                    if (src[i + 3] === 0) continue;
                    const d = Math.hypot(x - fire.x, (y - fire.y) * 1.1);
                    const raw = 1 / (1 + Math.pow(d / (W * 0.19), 2));
                    const f = Math.floor(raw * 7 + bayer(x, y)) / 7;
                    const k = ambient + strength * f;
                    put(x, y, [
                        Math.min(255, src[i] * k + warm[0] * f * strength),
                        Math.min(255, src[i + 1] * k * 0.92 + warm[1] * f * strength),
                        Math.min(255, src[i + 2] * k * 0.8)
                    ]);
                }
            }
        });
        const dim = lit(0.95, 0.16);
        const bright = lit(1.45, 0.2);

        const sparks = Array.from({length: 40}, () => ({x: 0, y: 0, vx: 0, vy: 0, age: 9, life: 1}));
        const spawn = (p: typeof sparks[number]) => {
            p.x = fire.x + (random() - 0.5) * 8;
            p.y = fire.y - 6 - random() * 6;
            p.vx = (random() - 0.5) * 6;
            p.vy = -(18 + random() * 26);
            p.age = 0;
            p.life = 1.5 + random() * 2.5;
        };
        sparks.forEach(p => {
            spawn(p);
            p.age = random() * p.life;
        });
        const flameCols = ['#c2341a', '#ff7a24', '#ffc24a', '#fff2be'];
        const glowG = s.createRadialGradient(fire.x, fire.y - 6, 1, fire.x, fire.y - 6, W * 0.35);
        glowG.addColorStop(0, 'rgba(255,140,50,1)');
        glowG.addColorStop(1, 'rgba(255,140,50,0)');
        let last = 0;

        return (ctx, t, beat) => {
            const dt = Math.min(0.1, t - last);
            last = t;
            const kick = pulse(beat);
            const flick = 0.5 + 0.25 * Math.sin(t * 7.3) + 0.15 * Math.sin(t * 13.1 + 1) + 0.1 * Math.sin(t * 3.1);

            ctx.drawImage(sky.canvas, 0, 0);
            ctx.drawImage(dim.canvas, 0, 0);
            ctx.globalAlpha = Math.min(1, Math.max(0, flick * 0.8 + kick * 0.25));
            ctx.drawImage(bright.canvas, 0, 0);
            ctx.globalAlpha = 1;

            // Embers in the logs.
            const step = Math.floor(t * 8);
            for (let i = -7; i <= 7; i += 2) {
                if (hash(i, step) < 0.5) continue;
                ctx.fillStyle = hash(i, step + 1) < 0.5 ? '#ff6a20' : '#ffb040';
                ctx.fillRect(fire.x + i, fire.y + 2 - Math.round(i * 0.25), 1, 1);
            }

            // Flames: a dithered teardrop that sways and flickers at 12fps.
            const fstep = Math.floor(t * 12);
            const height = 25 + Math.round(3 * Math.sin(t * 2.3) + 3 * kick);
            for (let k = 0; k < height; k++) {
                const v = k / height;
                const width = 9 * Math.pow(1 - v, 0.75) * (k < 3 ? 0.75 + k * 0.08 : 1);
                const sway = Math.sin(t * 4.5 + k * 0.35) * v * 2.6 + Math.sin(t * 9 + k * 0.5) * 0.5;
                const cx = fire.x + sway;
                for (let x = Math.round(cx - width); x <= Math.round(cx + width); x++) {
                    const r = Math.abs(x - cx) / (width + 0.5);
                    const heat = 1.05 - r * 0.75 - v * 0.75 + (hash(x * 3 + k, fstep) - 0.5) * 0.35;
                    if (heat < 0.15) continue;
                    ctx.fillStyle = flameCols[Math.min(3, Math.floor(heat * 4))];
                    ctx.fillRect(x, fire.y - k, 1, 1);
                }
            }
            // Loose tongues of flame breaking off the top.
            for (let j = 0; j < 3; j++) {
                const ph = (t * 1.6 + j / 3) % 1;
                const x = Math.round(fire.x + Math.sin(t * 3 + j * 2) * 3 + (j - 1) * 2);
                const y = Math.round(fire.y - height + 2 - ph * 9);
                ctx.fillStyle = ph < 0.5 ? flameCols[2] : flameCols[1];
                ctx.fillRect(x, y, ph < 0.5 ? 2 : 1, ph < 0.4 ? 2 : 1);
            }

            // Sparks rise, wander and fade from yellow to red.
            for (const p of sparks) {
                p.age += dt;
                if (p.age > p.life) spawn(p);
                p.x += (p.vx + Math.sin(t * 2 + p.life * 9) * 8) * dt;
                p.y += p.vy * dt;
                const f = p.age / p.life;
                ctx.fillStyle = f < 0.35 ? '#fff0a0' : f < 0.7 ? '#ffae40' : '#d8501c';
                ctx.globalAlpha = 1 - f * 0.7;
                ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
            }
            ctx.globalAlpha = 1;

            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.1 + 0.05 * flick + 0.06 * kick;
            ctx.fillStyle = glowG;
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        };
    }
};
