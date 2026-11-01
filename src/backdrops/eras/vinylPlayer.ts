import {Backdrop, canvas, css, ditherPick, hex, pixels, pulse, rng, wrappingNoise} from '../pixel';
import {ellipse, line} from './draw';

/**
 * A record player close-up on a wooden sideboard in a living room at night.
 * The platter turns, its label and strobe dots giving the spin away, a soft
 * sheen drifts across the grooves, the tonearm rides the record's warp, and
 * the table lamp behind breathes with the beat while dust floats in its light.
 */
export const VINYL_PLAYER: Backdrop = {
    id: 'eras-vinyl-player',
    name: 'Record player',
    bpm: 96,
    create(W, H) {
        const random = rng(41);
        const wallBottom = 46;
        const frontTop = 160;
        const cx = Math.round(W * 0.47), cy = 101;
        const R = 62;                      // record radius, top-down
        const squash = 0.66;               // perspective squash of the round things
        const ry = Math.round(R * squash);
        const lamp = {x: Math.round(W * 0.16), y: 30};

        const wallPal = ['#0c0708', '#170c0c', '#2a1510', '#4a2414', '#7a4219', '#b2702c'].map(hex);
        const woodPal = ['#120806', '#1f0f09', '#33180c', '#4d2511', '#6b3616', '#8e4e1f'].map(hex);
        const grain = wrappingNoise(W, H, 6, random);
        const grainBig = wrappingNoise(W, H, 30, random);

        // Wall, sideboard top and front, all lit from the lamp.
        const room = pixels(W, H, put => {
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const d = Math.hypot(x - lamp.x, (y - lamp.y) * 1.2);
                    const light = Math.max(0, 1 - d / (W * 0.85));
                    if (y < wallBottom) {
                        const stripe = (x % 12 < 6) ? 0.06 : 0;
                        put(x, y, ditherPick(wallPal, light * 0.95 + stripe, x, y));
                    } else if (y < frontTop) {
                        const g = grain(x * 0.35, y * 2.2) * 0.25 + grainBig(x, y) * 0.15;
                        put(x, y, ditherPick(woodPal, light * 0.85 + g - 0.08, x, y));
                    } else {
                        const g = grain(x * 0.3, y * 3) * 0.2;
                        put(x, y, ditherPick(woodPal, light * 0.45 + g - 0.1, x, y));
                    }
                }
            }
        });
        const r = room.ctx;
        r.fillStyle = '#a0612a';
        r.fillRect(0, wallBottom, W, 1);
        r.fillStyle = '#d08a3c';
        r.fillRect(0, frontTop, W, 1);
        r.fillStyle = 'rgba(0,0,0,0.35)';
        r.fillRect(0, frontTop + 1, W, 2);

        // Table lamp: base on the sideboard, a pleated shade glowing from inside.
        r.fillStyle = '#3a2210';
        r.fillRect(lamp.x - 1, lamp.y + 8, 3, wallBottom - lamp.y - 6);
        r.fillStyle = '#5a3418';
        r.fillRect(lamp.x - 6, wallBottom + 2, 13, 3);
        for (let y = 0; y < 18; y++) {
            const half = 7 + Math.round(y * 0.55);
            for (let x = -half; x <= half; x++) {
                const edge = 1 - Math.abs(x) / half;
                const pleat = (x + 40) % 3 === 0 ? -0.12 : 0;
                r.fillStyle = css(ditherPick(['#a85a1e', '#e3923a', '#ffc46a', '#ffe2a0'].map(hex),
                    0.25 + edge * 0.7 + pleat + y * 0.01, x, y));
                r.fillRect(lamp.x + x, lamp.y - 12 + y, 1, 1);
            }
        }

        // A stack of sleeves leaning on the wall, right of the player.
        const sx = Math.round(cx + R + 30);
        const sleeves = ['#1d4f6a', '#c2482d', '#e3b54a'];
        sleeves.forEach((c, i) => {
            const x = sx + i * 4, y = wallBottom - 30 + i * 3;
            r.fillStyle = c;
            r.fillRect(x, y, 30, 34);
            r.fillStyle = 'rgba(0,0,0,0.25)';
            r.fillRect(x + 29, y, 1, 34);
        });
        r.fillStyle = '#f0d9a8';
        ellipse(r, sx + 8 + 15, wallBottom - 24 + 15, 8, 8);
        r.fillStyle = '#e3b54a';
        ellipse(r, sx + 8 + 15, wallBottom - 24 + 15, 3, 3);

        // Plinth of the player: a darker slab with a lit bevel and two knobs.
        const px0 = cx - R - 14, px1 = cx + R + 30, py0 = cy - ry - 16, py1 = cy + ry + 18;
        r.fillStyle = '#1a0d08';
        r.fillRect(px0 + 2, py1, px1 - px0, 4);
        for (let y = py0; y < py1; y++) {
            for (let x = px0; x < px1; x++) {
                const v = 0.55 - (x - px0) / (px1 - px0) * 0.45 + (grain(x * 0.4, y * 2) - 0.5) * 0.15;
                r.fillStyle = css(ditherPick(['#1a0c06', '#26130a', '#341b0e', '#452514'].map(hex), v, x, y));
                r.fillRect(x, y, 1, 1);
            }
        }
        r.fillStyle = '#5a3018';
        r.fillRect(px0, py0, px1 - px0, 1);
        r.fillRect(px0, py0, 1, py1 - py0);
        r.fillStyle = '#140904';
        r.fillRect(px0, py1 - 1, px1 - px0, 3);
        r.fillStyle = '#7c7470';
        ellipse(r, px1 - 12, py1 - 9, 3, 2);
        ellipse(r, px1 - 22, py1 - 9, 3, 2);
        r.fillStyle = '#c9c0b4';
        r.fillRect(px1 - 13, py1 - 11, 2, 1);
        r.fillRect(px1 - 23, py1 - 11, 2, 1);

        // Platter: a metal disc whose edge carries the strobe dots.
        r.fillStyle = '#1c1a1c';
        ellipse(r, cx, cy + 3, R + 4, ry + 3);
        r.fillStyle = '#6d6a68';
        ellipse(r, cx, cy + 1, R + 4, ry + 3);
        r.fillStyle = '#0d0c0e';
        ellipse(r, cx, cy, R + 1, ry + 1);

        // The record, drawn top-down so it can be rotated, then squashed.
        const disc = pixels(2 * R + 1, 2 * R + 1, put => {
            for (let y = -R; y <= R; y++) {
                for (let x = -R; x <= R; x++) {
                    const d = Math.hypot(x, y);
                    if (d > R + 0.4) continue;
                    let c: [number, number, number];
                    if (d > 20) {
                        const band = Math.floor(d);
                        const gap = band === 32 || band === 41 || band === 50;
                        c = gap ? hex('#2a272c') : band % 2 ? hex('#141217') : hex('#1b191e');
                        if (d > R - 1.5) c = hex('#26232a');
                    } else if (d > 18.5) {
                        c = hex('#e9d8b0');
                    } else {
                        c = hex('#b5312b');
                        const a = Math.atan2(y, x);
                        // Printed band and a little emblem: the parts that show the spin.
                        if (d > 13 && d < 16 && a > 0.3 && a < 2.4) c = hex('#f0dfb8');
                        if (Math.hypot(x + 9, y + 4) < 3.3) c = hex('#f0dfb8');
                        if (d < 6 && d > 4.5) c = hex('#8d2420');
                    }
                    if (d < 1.6) c = hex('#d8d4cc');
                    put(R + x, R + y, c);
                }
            }
        });

        // Light caught by the grooves: two opposing soft wedges, dithered.
        const sheen = pixels(2 * R + 1, 2 * R + 1, put => {
            const c = hex('#ffd9a6');
            for (let y = -R; y <= R; y++) {
                for (let x = -R; x <= R; x++) {
                    const d = Math.hypot(x, y);
                    if (d > R - 1 || d < 22) continue;
                    const a = Math.atan2(y, x);
                    const v = Math.pow(Math.abs(Math.cos(a)), 14) * (0.35 + 0.65 * (d / R))
                        * (Math.floor(d) % 3 === 0 ? 0.6 : 1);
                    if (v > 0.12) put(R + x, R + y, c, Math.round(Math.min(1, v * 1.6) * 255));
                }
            }
        });
        const spin = canvas(2 * R + 1, 2 * R + 1);

        const glow = r.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, W * 0.6);
        glow.addColorStop(0, 'rgba(255,180,90,1)');
        glow.addColorStop(1, 'rgba(255,180,90,0)');

        const pivot = {x: cx + R + 16, y: cy - ry + 2};
        const motes = Array.from({length: 26}, () => ({
            x: random() * W * 0.6, y: random() * H * 0.8, sp: 0.6 + random() * 1.6, ph: random() * 10
        }));

        return (ctx, t, beat) => {
            const b = pulse(beat);
            const angle = t * Math.PI * 2 * (33.3 / 60);
            ctx.drawImage(room.canvas, 0, 0);

            // Strobe dots on the platter edge, moving with the spin.
            ctx.fillStyle = '#b8b2aa';
            for (let i = 0; i < 48; i++) {
                const a = angle + (i / 48) * Math.PI * 2;
                const s = Math.sin(a);
                if (s < 0.05) continue;
                ctx.fillRect(Math.round(cx + Math.cos(a) * (R + 3)), Math.round(cy + 2 + s * (ry + 2)), 1, 1);
            }

            const sc = spin.ctx;
            sc.clearRect(0, 0, 2 * R + 1, 2 * R + 1);
            sc.save();
            sc.translate(R + 0.5, R + 0.5);
            sc.rotate(angle);
            sc.drawImage(disc.canvas, -R - 0.5, -R - 0.5);
            sc.restore();
            sc.save();
            sc.globalCompositeOperation = 'lighter';
            sc.globalAlpha = 0.24 + 0.08 * b;
            sc.translate(R + 0.5, R + 0.5);
            sc.rotate(-0.75 + Math.sin(t * 0.25) * 0.35);
            sc.drawImage(sheen.canvas, -R - 0.5, -R - 0.5);
            sc.restore();
            ctx.drawImage(spin.canvas, cx - R, cy - ry, 2 * R + 1, 2 * ry + 1);

            // Tonearm: rides the warp of the record once a turn.
            const bob = Math.sin(angle) * 0.7;
            const head = {x: cx + R * 0.52, y: cy + ry * 0.52 + bob - 3};
            ctx.fillStyle = '#0c0a0a';
            line(ctx, pivot.x + 2, pivot.y + 5, head.x + 2, head.y + 6, 2);
            ctx.fillStyle = '#9a948c';
            ellipse(ctx, pivot.x, pivot.y + 1, 7, 5);
            ctx.fillStyle = '#d8d2c8';
            ellipse(ctx, pivot.x, pivot.y, 4, 3);
            ctx.fillStyle = '#4a4644';
            ctx.fillRect(pivot.x + 3, pivot.y - 10, 5, 6);
            ctx.fillStyle = '#c8c2b8';
            line(ctx, pivot.x + 4, pivot.y - 4, pivot.x + 1, pivot.y, 1);
            line(ctx, pivot.x, pivot.y, head.x + 4, head.y - 3, 2);
            ctx.fillStyle = '#f2ece0';
            line(ctx, pivot.x, pivot.y, head.x + 4, head.y - 3, 1);
            const hx = Math.round(head.x), hy = Math.round(head.y);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(hx - 3, hy + 3, 9, 2);
            ctx.fillStyle = '#b8b0a4';
            ctx.fillRect(hx - 4, hy - 4, 9, 5);
            ctx.fillStyle = '#efe8dc';
            ctx.fillRect(hx - 4, hy - 4, 9, 1);
            ctx.fillStyle = '#1c1a1a';
            ctx.fillRect(hx - 3, hy + 1, 6, 2);
            ctx.fillStyle = '#d8d2c8';
            ctx.fillRect(hx + 5, hy - 7, 1, 4);

            // Lamp light breathing gently, plus dust drifting through it.
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.1 + 0.05 * b;
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
            for (const m of motes) {
                const y = (m.y - t * m.sp * 2 + H) % H;
                const x = m.x + Math.sin(t * 0.4 + m.ph) * 6;
                const near = Math.max(0, 1 - Math.hypot(x - lamp.x, y - lamp.y) / (W * 0.45));
                ctx.fillStyle = `rgba(255,214,150,${(near * 0.6).toFixed(3)})`;
                ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
            }
            ctx.globalCompositeOperation = 'source-over';

            // Power light on the plinth.
            ctx.fillStyle = css(hex('#ff5a3a'), 0.6 + 0.4 * b);
            ctx.fillRect(px1 - 32, py1 - 10, 2, 1);
        };
    }
};
