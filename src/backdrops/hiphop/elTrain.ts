import {Backdrop, bayer, css, disc, ditherPick, hash, hex, pixels, pulse, rng} from '../pixel';
import {paintWindows, skyline} from '../skyline';
import {graffitiPiece, SPRAYS} from './graffiti';

/**
 * An elevated line over a night street: graffiti-bombed cars rumble across
 * the steel trestle every so often, throwing sparks off the rails, while
 * shop signs under the tracks buzz on the beat and glow in the wet road.
 */
export const EL_TRAIN: Backdrop = {
    id: 'hiphop-el-train',
    name: 'Elevated line',
    bpm: 88,
    create(W, H) {
        const random = rng(73);
        const rail = 80;
        const deckBottom = 94;
        const street = 150;
        const curb = 156;
        const sky = ['#05041a', '#0d0b2c', '#1c1540', '#3a2050', '#5a2a52'].map(hex);

        const back = pixels(W, H, put => {
            for (let y = 0; y < street; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, y / 130, x, y));
            for (let i = 0; i < 60; i++) put(random() * W, random() * 60, hex('#c8ccf0'), 60 + random() * 150);
            disc(put, Math.round(W * 0.8), 22, 7, () => hex('#efe4c6'));
            disc(put, Math.round(W * 0.8) + 3, 20, 6, (x, y) => ditherPick(sky, y / 130, x, y));
        });
        const far = skyline(back.ctx, {
            from: -10, to: W + 10, base: 126, minHeight: 40, maxHeight: 96, minWidth: 12, maxWidth: 26,
            colour: '#1a1434', lit: ['rgba(255,190,110,0.5)', 'rgba(140,170,255,0.45)'], litChance: 0.12
        }, random);

        // Front row of walk-ups with shops on the ground floor.
        const front = pixels(W, H, put => {
            let x = -6;
            while (x < W) {
                const w = 38 + Math.floor(random() * 30);
                const top = 70 + Math.floor(random() * 26);
                const brick = [hex('#2a1a24'), hex('#24182a'), hex('#2e1c1c')][Math.floor(random() * 3)];
                for (let y = top; y < street; y++)
                    for (let i = 0; i < w; i++) {
                        const mortar = (y % 3 === 0) || ((i + (Math.floor(y / 3) % 2) * 2) % 5 === 0);
                        put(x + i, y, mortar ? [brick[0] * 0.8, brick[1] * 0.8, brick[2] * 0.8] : brick);
                    }
                for (let i = -1; i <= w; i++) put(x + i, top, hex('#3a2a3a'));
                // Shop window and door.
                const shopTop = street - 20;
                const glow = [hex('#ffcf7a'), hex('#ffb35a'), hex('#9fe0ff'), hex('#ff9fc0')][Math.floor(random() * 4)];
                for (let y = shopTop; y < street - 2; y++)
                    for (let i = 3; i < w - 12; i++)
                        put(x + i, y, ditherPick([[glow[0] * 0.55, glow[1] * 0.55, glow[2] * 0.55], [glow[0] * 0.8, glow[1] * 0.8, glow[2] * 0.8], glow], (y - shopTop) / 16 + 0.15, x + i, y));
                // Upstairs windows, a few lit, just under the tracks.
                for (let wx = x + 4; wx < x + w - 6; wx += 9)
                    for (const wy of [100, 112]) {
                        if (wy < top + 3) continue;
                        const on = random() < 0.4;
                        const col = on ? (random() < 0.7 ? hex('#ffc66b') : hex('#8fb8ff')) : hex('#120c18');
                        for (let y = wy; y < wy + 6; y++) for (let i = 0; i < 4; i++) put(wx + i, y, col);
                    }
                for (let y = shopTop + 2; y < street; y++)
                    for (let i = w - 9; i < w - 4; i++) put(x + i, y, hex('#120c14'));
                // Striped awning.
                const awn = [hex('#7a1f3a'), hex('#1f4a5a'), hex('#2a5a2a')][Math.floor(random() * 3)];
                for (let y = shopTop - 4; y < shopTop; y++)
                    for (let i = 1; i < w - 10; i++) put(x + i, y, Math.floor(i / 3) % 2 ? awn : hex('#d8d0c0'));
                x += w + 2;
            }
            // Sidewalk, curb, wet road.
            for (let y = street; y < H; y++)
                for (let i = 0; i < W; i++) {
                    if (y < curb) put(i, y, (i % 16 === 0) ? hex('#1a1824') : hex('#2a2834'));
                    else if (y === curb) put(i, y, hex('#4a4856'));
                    else put(i, y, hash(i, y) < 0.05 ? hex('#1c1a28') : hex('#0e0d18'));
                }
        });

        // Neon signs over the shops, each a simple glowing shape.
        const signs = Array.from({length: Math.max(3, Math.round(W / 70))}, (_, i) => ({
            x: Math.round((i + 0.5) * W / Math.max(3, Math.round(W / 70)) + (random() - 0.5) * 20),
            y: 108 + Math.floor(random() * 8),
            w: 10 + Math.floor(random() * 8),
            colour: [hex('#ff4f9a'), hex('#3fd0ff'), hex('#3fe0a0'), hex('#ffb347')][i % 4],
            phase: random()
        }));

        // The steel: a Warren-truss girder on columns with knee braces.
        const span = 64;
        const steel = pixels(W, H, put => {
            const dark = hex('#0a0910'), mid = hex('#2a2638'), edge = hex('#4a4558');
            for (let x = 0; x < W; x++) {
                for (let y = rail; y < rail + 3; y++) put(x, y, y === rail ? edge : mid);
                for (let y = deckBottom - 3; y < deckBottom; y++) put(x, y, y === deckBottom - 3 ? edge : mid);
                if (x % 6 === 2) put(x, rail + 1, edge);
            }
            const bay = 12, depth = deckBottom - 3 - (rail + 3);
            for (let x = -bay; x < W + bay; x += bay)
                for (let k = 0; k < depth; k++) {
                    put(x + Math.round(k * bay / 2 / depth), rail + 3 + k, mid);
                    put(x + bay - Math.round(k * bay / 2 / depth), rail + 3 + k, mid);
                }
            for (let cx = Math.round(W * 0.1); cx < W + span; cx += span) {
                for (let y = deckBottom; y < street; y++)
                    for (let i = 0; i < 5; i++) put(cx + i, y, i === 0 ? edge : i === 4 ? dark : mid);
                for (let y = deckBottom; y < street; y += 5) put(cx + 2, y, edge);
                for (let k = 0; k < 12; k++) {
                    put(cx - 1 - k, deckBottom + 12 - k, mid);
                    put(cx + 5 + k, deckBottom + 12 - k, mid);
                }
                for (let i = -2; i < 7; i++) put(cx + i, street - 1, dark);
            }
            for (let x = 0; x < W; x++) put(x, deckBottom, dark);
            // The shadow the deck throws on the facades below it.
            for (let y = deckBottom + 1; y < deckBottom + 14; y++)
                for (let x = 0; x < W; x++)
                    if ((y - deckBottom) / 14 < bayer(x, y) * 1.2) put(x, y, hex('#06050c'), 140);
        });

        // The train, painted once: five cars of steel buried in paint.
        const carW = 92, gapW = 4, cars = 5;
        const trainW = cars * (carW + gapW);
        const top = rail - 32;
        const train = pixels(trainW, H, put => {
            for (let c = 0; c < cars; c++) {
                const x0 = c * (carW + gapW);
                const silver = hex('#7c8090'), lo = hex('#5a5e6c'), roof = hex('#43465a');
                for (let y = top; y < rail - 4; y++)
                    for (let i = 0; i < carW; i++) {
                        const roofRow = y < top + 3;
                        if (roofRow && (i < top + 3 - y || i >= carW - (top + 3 - y))) continue;
                        put(x0 + i, y, roofRow ? roof : (i % 12 === 0 ? lo : silver));
                    }
                // Paint from the windows down to the skirt, end to end.
                const pieceW = carW - 10;
                graffitiPiece((px, py, col) => {
                    if (px >= x0 + 1 && px < x0 + carW - 1 && py > top + 4 && py < rail - 5) put(px, py, col);
                }, x0 + 5, top + 12, pieceW, 16, random, SPRAYS[(c * 2 + 1) % SPRAYS.length]);
                // Windows and doors.
                for (let k = 0; k < 6; k++) {
                    const wx = x0 + 6 + k * 14 + (k > 2 ? 2 : 0);
                    const lit = hex('#ffe6a8');
                    for (let y = top + 6; y < top + 13; y++)
                        for (let i = 0; i < 9; i++) put(wx + i, y, (i === 0 || y === top + 6) ? hex('#2a2a36') : lit);
                    if (random() < 0.35) {
                        // A rider's head and shoulders against the light.
                        const hx = wx + 2 + Math.floor(random() * 4);
                        for (let y = top + 9; y < top + 13; y++)
                            for (let i = -1; i < 3; i++) if (y > top + 10 || (i >= 0 && i < 2)) put(hx + i, y, hex('#3a2a30'));
                    }
                }
                for (const dxp of [x0 + 26, x0 + 62])
                    for (let y = top + 4; y < rail - 5; y++) {
                        put(dxp, y, hex('#2a2a36'));
                        put(dxp + 4, y, hex('#2a2a36'));
                    }
                // Underframe and trucks.
                for (let i = 4; i < carW - 4; i++) for (let y = rail - 4; y < rail - 2; y++) put(x0 + i, y, hex('#121018'));
                for (const tx of [x0 + 12, x0 + carW - 12])
                    for (const wo of [-4, 4]) disc(put, tx + wo, rail - 1, 2, () => hex('#1c1a24'));
                // Couplers.
                if (c < cars - 1) for (let i = carW; i < carW + gapW; i++) put(x0 + i, rail - 8, hex('#121018'));
            }
            // Leading cab: headlights and a blank destination sign.
            for (let y = top + 3; y < top + 7; y++) for (let i = 30; i < 50; i++) put(i, y, hex('#3a2a10'));
            for (let i = 32; i < 48; i++) put(i, top + 4, hex('#ffb347'));
            for (const ly of [rail - 10]) for (const lx of [1, 2]) put(lx, ly, hex('#ffffff'));
            const last = trainW - gapW - 1;
            put(last, rail - 10, hex('#ff3030'));
            put(last - 1, rail - 10, hex('#ff3030'));
        });
        const trucks: number[] = [];
        for (let c = 0; c < cars; c++) trucks.push(c * (carW + gapW) + 12, c * (carW + gapW) + carW - 12);

        const period = 17, speed = 130;
        const car = {period: 9.5, speed: 55};

        return (ctx, t, beat) => {
            const kick = pulse(beat);
            const phase = t % period;
            const tx = Math.round(W + 30 - phase * speed);
            const onScreen = tx < W && tx + trainW > 0;
            const jolt = onScreen && kick > 0.6 ? 1 : 0;

            ctx.save();
            ctx.translate(0, jolt);
            ctx.drawImage(back.canvas, 0, -1);
            paintWindows(ctx, far, t);
            ctx.drawImage(front.canvas, 0, 0);

            // Signs breathe on the beat, and their colour bleeds into the road.
            for (const s of signs) {
                const buzz = hash(Math.floor(t * 9), s.phase * 100) < 0.04 ? 0.3 : 1;
                const a = (0.6 + 0.4 * kick) * buzz;
                ctx.fillStyle = css(s.colour, a);
                ctx.fillRect(s.x, s.y, s.w, 1);
                ctx.fillRect(s.x, s.y + 5, s.w, 1);
                ctx.fillRect(s.x, s.y, 1, 6);
                ctx.fillRect(s.x + s.w - 1, s.y, 1, 6);
                ctx.fillRect(s.x + 3, s.y + 2, s.w - 6, 2);
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = css(s.colour, 0.08 * a);
                ctx.fillRect(s.x - 3, s.y - 3, s.w + 6, 12);
                for (let y = curb + 2; y < H; y += 2) {
                    const wob = Math.round(Math.sin(y * 0.8 + t * 2) * 1.5);
                    ctx.fillStyle = css(s.colour, 0.16 * a * (1 - (y - curb) / (H - curb)));
                    ctx.fillRect(s.x + wob + 1, y, s.w - 2, 1);
                }
                ctx.globalCompositeOperation = 'source-over';
            }

            if (onScreen) ctx.drawImage(train.canvas, tx, 0);
            ctx.drawImage(steel.canvas, 0, 0);

            if (onScreen) {
                // Headlight beam on the track ahead and sparks under the trucks.
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = 'rgba(255,240,200,0.08)';
                ctx.fillRect(tx - 40, rail - 12, 40, 5);
                const slot = Math.floor(t * 8), f = t * 8 - slot;
                trucks.forEach((o, i) => {
                    const x = tx + o;
                    if (x < -10 || x > W + 10 || hash(slot, i) > 0.3) return;
                    ctx.fillStyle = `rgba(255,220,140,${(0.3 * (1 - f)).toFixed(3)})`;
                    ctx.fillRect(x - 3, rail - 2, 7, 4);
                    for (let k = 0; k < 7; k++) {
                        const vx = (hash(k, slot + i) - 0.3) * 30;
                        const vy = -10 + hash(slot, k + i) * 16;
                        const sx = x + vx * f, sy = rail + 1 + vy * f + 60 * f * f;
                        ctx.fillStyle = f < 0.5 ? '#ffe9a0' : '#ff8a2a';
                        ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
                    }
                });
                ctx.globalCompositeOperation = 'source-over';
            }

            // A car passes on the street now and then.
            const cp = (t % car.period) * car.speed - 40;
            if (cp < W + 40) {
                const x = Math.round(cp), y = curb + 6;
                ctx.fillStyle = '#07060c';
                ctx.fillRect(x, y, 30, 6);
                ctx.fillRect(x + 6, y - 4, 16, 4);
                ctx.fillStyle = '#2a3a5a';
                ctx.fillRect(x + 8, y - 3, 5, 3);
                ctx.fillRect(x + 15, y - 3, 5, 3);
                ctx.fillStyle = '#ff2a3a';
                ctx.fillRect(x, y + 1, 1, 2);
                ctx.fillStyle = '#fff2c8';
                ctx.fillRect(x + 29, y + 1, 1, 2);
                ctx.globalCompositeOperation = 'lighter';
                const g = ctx.createLinearGradient(x + 30, 0, x + 70, 0);
                g.addColorStop(0, 'rgba(255,240,200,0.22)');
                g.addColorStop(1, 'rgba(255,240,200,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.moveTo(x + 30, y + 1);
                ctx.lineTo(x + 70, y - 3);
                ctx.lineTo(x + 70, y + 8);
                ctx.fill();
                ctx.fillStyle = 'rgba(0,0,0,0.25)';
                ctx.fillRect(x, y + 6, 30, 1);
                ctx.globalCompositeOperation = 'source-over';
            }
            ctx.restore();
        };
    }
};

