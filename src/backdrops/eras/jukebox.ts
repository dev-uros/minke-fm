import {Backdrop, css, ditherPick, hex, pixels, pulse, RGB, rng} from '../pixel';
import {ellipse, line} from './draw';

/**
 * A jukebox glowing in an empty diner after closing. Its arches cycle through
 * the colours, bubbles climb the side tubes, a 45 turns behind the dome glass,
 * and the checkered floor catches the light, which swells on the beat.
 */
export const JUKEBOX: Backdrop = {
    id: 'eras-jukebox',
    name: 'Diner jukebox',
    bpm: 132,
    create(W, H) {
        const random = rng(73);
        const cx = Math.round(W / 2);
        const archY = 64;
        const R = 46;
        const baseY = 152;
        const box = {x: cx - R - 2, y: archY - R - 2, w: 2 * R + 5, h: baseY - archY + R + 4};
        const horizon = 70;
        const floorY = 140;

        const wallPal = ['#07040a', '#0e0814', '#1a0d1e', '#2a1428', '#3e1c30'].map(hex);
        const panelPal = ['#0a0306', '#16050a', '#280910', '#3e1016'].map(hex);
        const glowAt = (x: number, y: number) =>
            Math.max(0, 1 - Math.hypot(x - cx, (y - archY - 20) * 1.2) / (W * 0.62));

        const room = pixels(W, H, put => {
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const g = glowAt(x, y);
                    if (y < 104) put(x, y, ditherPick(wallPal, g * 1.05, x, y));
                    else if (y < floorY) {
                        // Quilted red vinyl lower wall.
                        const q = ((x + (y >> 3) * 4) % 8 === 0 || y % 8 === 0) ? -0.15 : 0;
                        put(x, y, ditherPick(panelPal, g * 1.1 + q, x, y));
                    } else {
                        const dz = y - horizon;
                        const z = 900 / dz;
                        const u = ((x - cx) * z) / 80;
                        const check = (Math.floor(u) + Math.floor(z)) & 1;
                        const light = g * 1.2 * (0.6 + 0.4 * (y - floorY) / (H - floorY));
                        const pal = check
                            ? ['#0c080c', '#241c20', '#4a3a3a', '#8a7468'].map(hex)
                            : ['#050306', '#0c070a', '#160c10', '#24121a'].map(hex);
                        put(x, y, ditherPick(pal, light, x, y));
                    }
                }
            }
        });
        const r = room.ctx;
        // Chrome trim along the wall.
        r.fillStyle = '#5a5060';
        r.fillRect(0, 103, W, 1);
        r.fillStyle = '#a89ab0';
        r.fillRect(0, 104, W, 1);
        r.fillStyle = '#2a2230';
        r.fillRect(0, 105, W, 2);
        r.fillStyle = '#1a1018';
        r.fillRect(0, floorY - 1, W, 1);

        // Two stools at the edges of the light.
        for (const sx of [cx - R - 46, cx + R + 46]) {
            r.fillStyle = '#0c080c';
            ellipse(r, sx, floorY + 18, 8, 2);
            r.fillStyle = '#4a4450';
            r.fillRect(sx - 1, floorY - 18, 2, 36);
            r.fillStyle = '#2a0a10';
            ellipse(r, sx, floorY - 20, 10, 3);
            r.fillStyle = '#7a1a24';
            ellipse(r, sx, floorY - 21, 10, 2);
            r.fillStyle = '#c04050';
            r.fillRect(sx - 5, floorY - 23, 7, 1);
        }

        // The jukebox's fixed parts, in its own box. d is the distance from the
        // arch centre, which turns into distance from the middle on the sides.
        const dist = (x: number, y: number) => y <= archY ? Math.hypot(x - cx, y - archY) : Math.abs(x - cx);
        const local = (x: number, y: number) => [x - box.x, y - box.y] as const;
        const body = pixels(box.w, box.h, put => {
            const chrome = ['#3a3440', '#7a7080', '#c8c0cc', '#f4eef8'].map(hex);
            const wood = ['#1a0a06', '#2e140a', '#4a2412'].map(hex);
            for (let y = box.y; y < baseY; y++) {
                for (let x = box.x; x < box.x + box.w; x++) {
                    const d = dist(x, y);
                    const [lx, ly] = local(x, y);
                    if (d > R + 0.5) continue;
                    if (d > R - 2) put(lx, ly, ditherPick(wood, 0.5, x, y));
                    else if (d > 37 && d <= 39) put(lx, ly, ditherPick(chrome, 0.3 + ((x - cx) < 0 ? 0.5 : 0.2), x, y));
                    else if (d > 29 && d <= 31) put(lx, ly, ditherPick(chrome, 0.6, x, y));
                    else if (d <= 29) {
                        if (y <= archY) {
                            // The dome window, warm inside.
                            const v = 0.2 + (y - (archY - 29)) / 29 * 0.5;
                            put(lx, ly, ditherPick(['#1a0a10', '#3a1418', '#6a2a1c', '#a0501e'].map(hex), v, x, y));
                        } else if (y < archY + 28) {
                            put(lx, ly, ditherPick(wood, 0.3, x, y));
                        } else if (y < archY + 34) {
                            put(lx, ly, ditherPick(chrome, 0.4, x, y));
                        } else if (y < baseY - 10) {
                            put(lx, ly, hex('#2a0c0a'));
                        } else {
                            put(lx, ly, ditherPick(wood, 0.6, x, y));
                        }
                    }
                }
            }
            // Selection cards: two columns of small cards with a red title line.
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 2; col++) {
                    const x0 = cx - 24 + col * 25, y0 = archY + 3 + row * 5;
                    for (let i = 0; i < 22; i++) {
                        for (let j = 0; j < 4; j++) {
                            const [lx, ly] = local(x0 + i, y0 + j);
                            put(lx, ly, j === 0 ? hex('#c0302a') : (j === 2 && i > 2 && i < 18) ? hex('#8a7a6a') : hex('#efe2c4'));
                        }
                    }
                }
            }
            // Push buttons.
            for (let i = 0; i < 10; i++) {
                const [lx, ly] = local(cx - 24 + i * 5, archY + 30);
                put(lx, ly, hex('#ffffff'));
                put(lx + 1, ly, hex('#d8d0e0'));
                put(lx, ly + 1, hex('#8a8090'));
                put(lx + 1, ly + 1, hex('#5a5060'));
            }
            // Chrome base kick.
            for (let x = box.x; x < box.x + box.w; x++) {
                const [lx, ly] = local(x, baseY - 1);
                put(lx, ly, hex('#c8c0cc'));
            }
        });

        // Grille bars over the lit speaker cloth, drawn after the glow.
        const grille = pixels(box.w, box.h, put => {
            for (let y = archY + 36; y < baseY - 12; y++) {
                for (let x = cx - 28; x <= cx + 28; x++) {
                    const k = x - cx;
                    // A fan of chrome bars and a central medallion.
                    const fan = Math.abs(k) % 6 === 0;
                    const med = Math.hypot(k, y - (archY + 52)) < 7;
                    const [lx, ly] = local(x, y);
                    if (med) put(lx, ly, Math.hypot(k, y - (archY + 52)) < 5 ? hex('#ffe9a8') : hex('#d8d0e0'));
                    else if (fan) put(lx, ly, hex('#a89ab0'));
                }
            }
        });

        // Arch tubes, precomputed at several colour phases and cross-faded.
        const hues: RGB[] = ['#ff3b4a', '#ff9a2e', '#ffe24a', '#4ae08a', '#3ac8ff', '#c06bff'].map(hex);
        const phases = 12;
        const tubes = Array.from({length: phases}, (_, k) => pixels(box.w, box.h, put => {
            const ph = (k / phases) * hues.length;
            for (let y = box.y; y <= archY + 4; y++) {
                for (let x = box.x; x < box.x + box.w; x++) {
                    const d = dist(x, y);
                    const outer = d > 39 && d <= R - 2;
                    const inner = d > 31 && d <= 37;
                    if (!outer && !inner) continue;
                    const along = Math.atan2(archY - y, x - cx) / Math.PI; // 0..1 across the arch
                    const pos = ((along * 3 + ph + (inner ? 3 : 0)) % hues.length + hues.length) % hues.length;
                    const i = Math.floor(pos);
                    const c = pos - i > 0.5 + (((x + y) & 1) ? 0.15 : -0.15) ? hues[(i + 1) % hues.length] : hues[i];
                    // Lighter down the middle of each tube.
                    const mid = inner ? Math.abs(d - 34) < 1.2 : Math.abs(d - 41.5) < 1.2;
                    const [lx, ly] = local(x, y);
                    put(lx, ly, mid ? [Math.min(255, c[0] + 90), Math.min(255, c[1] + 90), Math.min(255, c[2] + 90)] : c);
                }
            }
        }));

        // The side tubes hold the bubbles.
        const tubeL = cx - 42, tubeR = cx + 39, tubeW = 4, tubeTop = archY + 5, tubeBot = baseY - 8;
        const bubbles = Array.from({length: 22}, (_, i) => ({
            side: i % 2, y: random(), sp: 0.12 + random() * 0.15, dx: Math.floor(random() * (tubeW - 1)), big: random() < 0.3
        }));

        const glow = r.createRadialGradient(cx, archY, 4, cx, archY, W * 0.5);
        glow.addColorStop(0, 'rgba(255,140,90,1)');
        glow.addColorStop(1, 'rgba(255,140,90,0)');

        return (ctx, t, beat) => {
            const b = pulse(beat);
            ctx.drawImage(room.canvas, 0, 0);
            ctx.drawImage(body.canvas, box.x, box.y);

            // Record turning behind the dome glass.
            const ry = archY - 12;
            ctx.fillStyle = '#0a0608';
            ellipse(ctx, cx, ry + 1, 15, 4);
            ctx.fillStyle = '#16101a';
            ellipse(ctx, cx, ry, 15, 4);
            ctx.fillStyle = '#c0302a';
            ellipse(ctx, cx, ry, 4, 1);
            const a = t * Math.PI * 2 * 0.75;
            ctx.fillStyle = '#ffd9a0';
            ctx.fillRect(Math.round(cx + Math.cos(a) * 11), Math.round(ry + Math.sin(a) * 3), 2, 1);
            // A stack of records waiting and the arm.
            ctx.fillStyle = '#100a0e';
            for (let i = 0; i < 4; i++) ctx.fillRect(cx - 24, ry - 10 + i * 3, 2, 14);
            ctx.fillStyle = '#c8c0cc';
            line(ctx, cx + 20, ry - 9, cx + 9, ry - 1);
            ctx.fillRect(cx + 19, ry - 11, 3, 3);
            // Glass highlight.
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            for (let i = 0; i < 12; i++) ctx.fillRect(cx - 18 + i, archY - 24 + Math.round(i * 0.4), 1, 1);

            // Arch colours rolling round.
            const p = (t * 1.5) % phases;
            const k = Math.floor(p);
            ctx.drawImage(tubes[k].canvas, box.x, box.y);
            ctx.globalAlpha = p - k;
            ctx.drawImage(tubes[(k + 1) % phases].canvas, box.x, box.y);
            ctx.globalAlpha = 1;

            // Bubble tubes.
            for (const x0 of [tubeL, tubeR]) {
                ctx.fillStyle = '#ff6a2a';
                ctx.fillRect(x0, tubeTop, tubeW, tubeBot - tubeTop);
                ctx.fillStyle = '#ffb04a';
                ctx.fillRect(x0 + 1, tubeTop, 1, tubeBot - tubeTop);
                ctx.fillStyle = '#c8c0cc';
                ctx.fillRect(x0 - 1, tubeTop - 1, tubeW + 2, 2);
                ctx.fillRect(x0 - 1, tubeBot, tubeW + 2, 2);
            }
            ctx.fillStyle = '#fff2d0';
            for (const bub of bubbles) {
                const f = ((bub.y + t * bub.sp) % 1);
                const y = Math.round(tubeBot - 2 - f * (tubeBot - tubeTop - 4));
                const x = (bub.side ? tubeR : tubeL) + bub.dx;
                ctx.fillRect(x, y, bub.big ? 2 : 1, bub.big ? 2 : 1);
            }

            // Speaker cloth glowing amber, swelling with the music.
            const cloth = ctx.createLinearGradient(0, archY + 36, 0, baseY - 12);
            cloth.addColorStop(0, css(hex('#ffb04a'), 0.55 + 0.35 * b));
            cloth.addColorStop(1, css(hex('#c0301a'), 0.35 + 0.25 * b));
            ctx.fillStyle = cloth;
            ctx.fillRect(cx - 28, archY + 36, 57, baseY - 12 - archY - 36);
            ctx.drawImage(grille.canvas, box.x, box.y);

            // The machine lights the whole room.
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.12 + 0.08 * b;
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';

            // Its reflection on the polished floor.
            ctx.fillStyle = css(hues[Math.floor(t * 1.5 / phases * hues.length) % hues.length], 0.1 + 0.06 * b);
            ctx.fillRect(cx - R + 4, baseY + 1, 2 * R - 8, 1);
            ctx.fillRect(cx - R + 10, baseY + 3, 2 * R - 20, 1);
            ctx.fillStyle = css(hex('#ffb04a'), 0.08 + 0.05 * b);
            ctx.fillRect(cx - 26, baseY + 6, 52, 1);
            ctx.fillRect(cx - 20, baseY + 9, 40, 1);
        };
    }
};
