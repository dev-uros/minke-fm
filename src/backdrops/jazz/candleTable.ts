import {Backdrop, canvas, css, ditherPick, hex, pixels, pulse, RGB, rng} from '../pixel';

/**
 * A table near the front of a jazz club, close up: a cocktail glass with a
 * cherry, a candle flickering beside it, and the stage lights behind melted
 * into slow, breathing bokeh. Everything is mirrored faintly in the varnish.
 */
export const CANDLE_TABLE: Backdrop = {
    id: 'jazz-candle-table',
    name: 'Table by the stage',
    bpm: 66,
    create(W, H) {
        const random = rng(73);
        const cx = Math.round(W / 2);
        const tableY = 124;
        const gx = cx + 24, rimY = 56, apexY = 92, stemEnd = 120, half = 26;
        const kx = cx - 32, top = 78;

        const room = ['#040203', '#0b0507', '#150a0b', '#22120f', '#331b14'].map(hex);
        const wood = ['#050302', '#0e0805', '#1a0f08', '#2b190d', '#422714', '#5e381b'].map(hex);

        const back = pixels(W, H, put => {
            for (let y = 0; y < tableY; y++) {
                for (let x = 0; x < W; x++) {
                    const d = Math.hypot((x - cx) / W, (y - 60) / H);
                    put(x, y, ditherPick(room, 0.75 - d * 1.6, x, y));
                }
            }
            // Varnished table top: long grain running away from us.
            for (let y = tableY; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const u = (x - cx) / (1 + (y - tableY) * 0.03);
                    const grain = Math.sin(u * 0.35 + Math.sin(u * 0.05) * 3) * 0.5 + 0.5;
                    let v = 0.18 + grain * 0.18 + ((y - tableY) / (H - tableY)) * 0.12;
                    if (y === tableY) v = 0.85;
                    if (y === tableY + 1) v = 0.05;
                    put(x, y, ditherPick(wood, v, x, y));
                }
            }
        });

        // Bokeh: the stage lights out of focus, each a soft disc with a brighter rim.
        const tints = ['#ffb347', '#ff8a3d', '#ffd27a', '#e0607a', '#ffb347', '#ffd27a', '#d86a9a', '#ff9a5a'].map(hex);
        const bokeh = Array.from({length: Math.round(W / 13)}, (_, i) => {
            const r = 5 + Math.floor(random() * 11);
            const colour = tints[Math.floor(random() * tints.length)];
            const sprite = pixels(2 * r + 3, 2 * r + 3, put => {
                for (let y = -r - 1; y <= r + 1; y++) {
                    for (let x = -r - 1; x <= r + 1; x++) {
                        const d = Math.hypot(x, y);
                        if (d > r + 0.5) continue;
                        const a = d > r - 1.2 ? 150 : 70 + ((x * 3 + y * 5) & 7) * 3;
                        put(x + r + 1, y + r + 1, colour, a);
                    }
                }
            });
            return {
                sprite: sprite.canvas, r,
                x: random() * W, y: 8 + random() * (tableY - 30),
                ph: random() * 10, beats: i % 4 === 0
            };
        });

        // The glass, the cherry and the candle, built once.
        const glassEdge = hex('#d8e6ff');
        const amber = ['#5a1e08', '#8a3610', '#c25a1c', '#e8862e', '#ffbe62'].map(hex);
        const wax = ['#6e5a44', '#a48e70', '#d2bf9c', '#f0e2c4'].map(hex);
        const jar = ['#2a0606', '#5a0f0c', '#8e2416', '#c84a26', '#f07a3c'].map(hex);
        const objects = pixels(W, H, put => {
            const halfAt = (y: number) => ((apexY - y) / (apexY - rimY)) * half;
            // Liquid first, then the glass outline over it.
            for (let y = rimY + 8; y < apexY; y++) {
                const h = halfAt(y);
                for (let x = Math.ceil(gx - h) + 1; x < gx + h - 1; x++) {
                    const v = 0.3 + ((y - rimY) / (apexY - rimY)) * 0.4 + (x < gx ? 0.15 : -0.05);
                    put(x, y, ditherPick(amber, y === rimY + 8 ? 0.95 : v, x, y));
                }
            }
            for (let y = rimY + 1; y < rimY + 8; y++) {
                const h = halfAt(y);
                for (let x = Math.ceil(gx - h) + 1; x < gx + h - 1; x++) put(x, y, glassEdge, 22);
            }
            for (let y = rimY; y <= apexY; y++) {
                const h = halfAt(y);
                put(gx - h, y, glassEdge, 200);
                put(gx + h, y, glassEdge, 120);
            }
            for (let x = gx - half; x <= gx + half; x++) put(x, rimY, glassEdge, 170);
            for (let y = apexY; y < stemEnd; y++) {
                put(gx, y, glassEdge, 160);
                put(gx - 1, y, glassEdge, 60);
                put(gx + 1, y, glassEdge, 40);
            }
            for (let x = -14; x <= 14; x++) {
                put(gx + x, stemEnd + (Math.abs(x) > 10 ? 1 : 0), glassEdge, 170 - Math.abs(x) * 5);
                put(gx + x, stemEnd + 2, glassEdge, 80);
                put(gx + x, stemEnd + 3, glassEdge, 40);
            }
            // Cherry on a pick.
            for (let i = 0; i <= 22; i++) put(gx + 8 - i * 0.75, rimY - 6 + i, hex('#d8c08a'));
            const ch = {x: gx - 7, y: rimY + 12};
            for (let y = -4; y <= 4; y++)
                for (let x = -4; x <= 4; x++)
                    if (x * x + y * y <= 17) put(ch.x + x, ch.y + y, hex(x + y < -3 ? '#ff6a6a' : x + y > 3 ? '#5a0610' : '#b0101e'));
            put(ch.x - 1, ch.y - 2, hex('#ffd0d0'));

            // Candle in a short red glass, with a drip of wax.
            for (let y = top; y < tableY; y++) {
                for (let x = kx - 6; x <= kx + 6; x++) {
                    const v = 0.85 - Math.abs(x - kx + 2) / 8 - (y - top) / 70;
                    put(x, y, ditherPick(wax, y === top ? 0.95 : v, x, y));
                }
            }
            for (let y = top + 1; y < top + 10; y++) put(kx + 4, y, wax[3]);
            put(kx + 4, top + 10, wax[2]);
            for (let y = 104; y < tableY; y++) {
                for (let x = kx - 10; x <= kx + 10; x++) {
                    const facet = ((x - kx + 20) + (y - 104)) % 5 === 0 || ((x - kx + 20) - (y - 104)) % 5 === 0;
                    const v = 0.8 - Math.abs(x - kx) / 13 - (y - 104) / 40 - (facet ? 0.25 : 0);
                    put(x, y, ditherPick(jar, y === 104 ? 0.95 : v, x, y));
                }
            }
        });

        // A faint mirror image in the varnish.
        const mirror = canvas(W, H);
        mirror.ctx.save();
        mirror.ctx.translate(0, tableY * 2 + 1);
        mirror.ctx.scale(1, -1);
        mirror.ctx.drawImage(objects.canvas, 0, 0);
        mirror.ctx.restore();

        const flameLight: RGB = hex('#ffb55a');

        return (ctx, t, beat) => {
            const kick = pulse(beat);
            const flicker = 0.75 + 0.12 * Math.sin(t * 7.3) + 0.08 * Math.sin(t * 13.1 + 1) + 0.05 * Math.sin(t * 23.7);

            ctx.drawImage(back.canvas, 0, 0);

            ctx.globalCompositeOperation = 'lighter';
            for (const b of bokeh) {
                const x = Math.round(((b.x + Math.sin(t * 0.08 + b.ph) * 6 + W + b.r) % (W + 2 * b.r)) - b.r);
                const y = Math.round(b.y + Math.sin(t * 0.13 + b.ph * 2) * 3);
                ctx.globalAlpha = Math.max(0, 0.45 + 0.25 * Math.sin(t * 0.4 + b.ph) + (b.beats ? 0.3 * kick : 0));
                if (ctx.globalAlpha > 0.02) ctx.drawImage(b.sprite, x - b.r - 1, y - b.r - 1);
            }
            ctx.globalAlpha = 1;

            // Candle glow on the room and table.
            const fx = kx, fy = top - 8;
            const g = ctx.createRadialGradient(fx, fy, 1, fx, fy, 70);
            g.addColorStop(0, css(flameLight, 0.3 * flicker));
            g.addColorStop(1, css(flameLight, 0));
            ctx.fillStyle = g;
            ctx.fillRect(fx - 70, fy - 70, 140, 140);
            ctx.save();
            ctx.translate(fx, tableY + 6);
            ctx.scale(1, 0.25);
            const pool = ctx.createRadialGradient(0, 0, 1, 0, 0, 60);
            pool.addColorStop(0, css(flameLight, 0.28 * flicker));
            pool.addColorStop(1, css(flameLight, 0));
            ctx.fillStyle = pool;
            ctx.fillRect(-60, -60, 120, 120);
            ctx.restore();
            ctx.globalCompositeOperation = 'source-over';

            ctx.globalAlpha = 0.16;
            ctx.drawImage(mirror.canvas, 0, tableY + 1, W, H - tableY - 1, 0, tableY + 1, W, H - tableY - 1);
            ctx.globalAlpha = 1;
            ctx.drawImage(objects.canvas, 0, 0);

            // The flame: a teardrop that stretches and leans.
            const fh = Math.round(10 + 2.5 * Math.sin(t * 9.1) * Math.sin(t * 3.3) + (flicker - 0.75) * 8);
            const lean = Math.sin(t * 1.7) * 0.8 + Math.sin(t * 5.3) * 0.4;
            ctx.fillStyle = '#3a0c08';
            ctx.fillRect(kx, top - 2, 1, 2);
            for (let i = 0; i < fh; i++) {
                const f = i / fh;
                const w = f < 0.12 ? 3 : f < 0.5 ? 5 : f < 0.8 ? 3 : 1;
                const x = Math.round(kx - Math.floor(w / 2) + lean * f * f * 3);
                const y = top - 3 - i;
                ctx.fillStyle = f < 0.12 ? '#ff8a3a' : '#ffc45a';
                ctx.fillRect(x, y, w, 1);
                if (w > 2 && f < 0.75) {
                    ctx.fillStyle = '#fff3c8';
                    ctx.fillRect(x + 1, y, w - 2, 1);
                }
            }
            ctx.fillStyle = 'rgba(120,150,255,0.7)';
            ctx.fillRect(kx - 1, top - 3, 3, 1);
            // Its reflection, a wavering smear in the varnish.
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#ffc45a';
            ctx.fillRect(kx - 1 + Math.round(lean), 2 * tableY + 1 - (top - 3), 3, Math.round(fh * 0.8));
            ctx.globalAlpha = 1;

            // Light catching the glass: a glint that slides down the bowl, and a sparkle every bar.
            const slide = (t * 0.25) % 1;
            const sy = Math.round(rimY + 2 + slide * (apexY - rimY - 6));
            const sxp = Math.round(gx - ((apexY - sy) / (apexY - rimY)) * half) + 1;
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            ctx.fillRect(sxp, sy, 1, 3);
            const bar = pulse(beat / 4);
            if (bar > 0.05) {
                const px = gx + 18, py = rimY;
                const len = Math.round(1 + bar * 4);
                ctx.fillStyle = `rgba(255,248,230,${bar.toFixed(3)})`;
                ctx.fillRect(px - len, py, len * 2 + 1, 1);
                ctx.fillRect(px, py - len, 1, len * 2 + 1);
            }
        };
    }
};
