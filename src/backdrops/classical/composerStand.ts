import {Backdrop, css, ditherPick, hash, hex, pixels, pulse, rng, RGB} from '../pixel';

/**
 * A music stand by candlelight: a quill writes notes along the staves one beat
 * at a time while a wooden metronome ticks beside it. When both pages are full
 * the ink fades and the piece starts again.
 */
export const COMPOSER_STAND: Backdrop = {
    id: 'classical-composer-stand',
    name: 'Candlelit score',
    bpm: 72,
    create(W, H) {
        const random = rng(23);
        const cx = Math.round(W / 2);
        const side = Math.round(Math.max(64, W * 0.24));
        const candle = {x: cx - side, y: 104};
        const metro = {x: cx + side, base: 128};
        const tableTop = 128;
        const floorY = 150;

        const pageW = 40, pageTop = 34, pageBottom = 104;
        const pages = [cx - 1 - pageW, cx + 1];
        const staffTops = [42, 55, 68, 81, 94];

        const wall = ['#070405', '#0f0807', '#1a0e0a', '#2a170e', '#402512', '#5a3818'].map(hex);
        const wood = ['#120804', '#241208', '#3a1e0c', '#5a3414', '#7a4c20'].map(hex);
        const paper = ['#6a5638', '#9a845c', '#c4ad82', '#e2d0a6', '#f4e6c2'].map(hex);
        const metal: RGB = hex('#16100c'), metalLit: RGB = hex('#5a4630');

        const back = pixels(W, H, put => {
            // Wall lit by the candle, wainscot below, floorboards.
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const d = Math.hypot(x - candle.x, (y - candle.y) * 1.2);
                    const light = 1 - Math.min(1, d / (W * 0.85));
                    if (y < 116) put(x, y, ditherPick(wall, light * 0.95, x, y));
                    else if (y < floorY) {
                        const panel = (x % 40 === 0 || y === 118 || y === floorY - 2) ? -0.15 : 0;
                        put(x, y, ditherPick(wood, light * 0.8 + panel + 0.1, x, y));
                    } else {
                        const seam = (y - floorY) % 6 === 0 ? -0.2 : 0;
                        put(x, y, ditherPick(wood, light * 0.7 + seam + ((y - floorY) / 30) * 0.2, x, y));
                    }
                }
            }
            for (let x = 0; x < W; x++) put(x, 116, wood[3]);

            // A tall arched window on the right with a cold night outside.
            const night = ['#0a1030', '#142050', '#22306a'].map(hex);
            const wx0 = metro.x - 14, wx1 = metro.x + 14, wy0 = 22, wy1 = 104;
            for (let y = wy0 - 14; y < wy1; y++) {
                for (let x = wx0 - 2; x <= wx1 + 2; x++) {
                    const ax = (x - metro.x) / 16, ay = (y - wy0) / 14;
                    if (y < wy0 && ax * ax + ay * ay > 1) continue;
                    const inner = (x - metro.x) / 14, innerY = (y - wy0) / 12;
                    const glass = x > wx0 && x < wx1 && y < wy1 - 2 && (y >= wy0 || inner * inner + innerY * innerY < 1);
                    const bar = x === metro.x || (y - wy0) % 20 === 0;
                    if (glass && !bar) put(x, y, ditherPick(night, 0.2 + (y - wy0 + 14) / (wy1 - wy0 + 14) * 0.8, x, y));
                    else put(x, y, wood[x < metro.x ? 2 : 1]);
                }
            }
            for (let i = 0; i < 14; i++) {
                const sx = wx0 + 2 + Math.floor(random() * 26), sy = wy0 - 8 + Math.floor(random() * 70);
                if (sx !== metro.x) put(sx, sy, hex('#c8d0ff'), 140 + Math.floor(random() * 100));
            }
            for (let x = wx0 - 4; x <= wx1 + 4; x++) {
                put(x, wy1 - 1, wood[4]);
                put(x, wy1, wood[2]);
            }

            // The stand: pole, tripod and a frame holding two pages.
            for (let y = pageBottom; y < floorY + 14; y++) put(cx, y, y % 9 === 0 ? metalLit : metal);
            for (let k = 0; k < 18; k++) {
                put(cx - Math.round(k * 0.9), floorY + 8 + Math.round(k * 0.4), metal);
                put(cx + Math.round(k * 0.9), floorY + 8 + Math.round(k * 0.4), metal);
                put(cx, floorY + 13 + Math.round(k * 0.2), metal);
            }
            for (let x = pages[0] - 3; x < pages[1] + pageW + 3; x++) {
                put(x, pageBottom, metalLit);
                put(x, pageBottom + 1, metal);
                put(x, pageBottom + 2, metal);
            }
            for (let y = pageTop + 6; y < pageBottom; y++) {
                put(pages[0] - 2, y, metal);
                put(pages[1] + pageW + 1, y, metal);
            }
            // Paper, warmer on the side facing the candle, with a soft fold in the middle.
            for (const px of pages) {
                for (let y = pageTop; y < pageBottom; y++) {
                    for (let x = px; x < px + pageW; x++) {
                        const toward = 1 - (x - (cx - pageW)) / (pageW * 2);
                        const fold = Math.abs(x - cx) < 3 ? -0.18 : 0;
                        const edge = y === pageTop || x === px || x === px + pageW - 1 ? -0.12 : 0;
                        put(x, y, ditherPick(paper, 0.55 + toward * 0.4 + fold + edge, x, y));
                    }
                }
                // Staves, with a little clef at the start of each.
                for (const st of staffTops) {
                    for (let l = 0; l < 5; l++) for (let x = px + 3; x < px + pageW - 3; x++) put(x, st + l * 2, paper[1]);
                    const k = px + 4;
                    [[1, -1], [1, 0], [0, 1], [0, 2], [1, 3], [2, 4], [1, 5], [0, 6], [1, 7], [1, 8], [1, 9], [0, 10]]
                        .forEach(([dx, dy]) => put(k + dx, st + dy - 1, hex('#3a2a1c')));
                    for (let l = 0; l < 9; l++) put(px + pageW - 4, st + l, paper[0]);
                }
            }

            // Two little tables: candle on the left, metronome on the right.
            for (const tx of [candle.x, metro.x]) {
                for (let x = tx - 16; x <= tx + 16; x++) {
                    put(x, tableTop, wood[4]);
                    put(x, tableTop + 1, wood[3]);
                    put(x, tableTop + 2, wood[1]);
                }
                for (const lx of [tx - 13, tx + 12]) for (let y = tableTop + 3; y < floorY + 10; y++) {
                    put(lx, y, wood[1]);
                    put(lx + 1, y, wood[0]);
                }
            }

            // Brass holder and the candle itself.
            const brass = ['#3a2408', '#7a5418', '#c8962e', '#f0d070'].map(hex);
            for (let x = candle.x - 5; x <= candle.x + 5; x++) {
                put(x, tableTop - 1, brass[x < candle.x ? 2 : 1]);
                put(x, tableTop - 2, brass[x < candle.x ? 3 : 2]);
            }
            for (let y = tableTop - 7; y < tableTop - 2; y++) put(candle.x, y, brass[2]);
            for (let x = candle.x - 3; x <= candle.x + 3; x++) put(x, tableTop - 8, brass[3]);
            for (let y = candle.y; y < tableTop - 8; y++) {
                put(candle.x - 1, y, hex('#f6ead0'));
                put(candle.x, y, hex('#e4d4b4'));
                put(candle.x + 1, y, hex('#b8a484'));
            }
            put(candle.x - 1, candle.y + 3, hex('#fff8e8'));
            put(candle.x - 1, candle.y + 4, hex('#fff8e8'));
            put(candle.x, candle.y - 1, hex('#2a1a10'));

            // Metronome: a tapering wooden case with an open face.
            const mTop = metro.base - 30;
            for (let y = mTop; y < metro.base; y++) {
                const f = (y - mTop) / (metro.base - mTop);
                const half = Math.round(3 + f * 6);
                for (let x = metro.x - half; x <= metro.x + half; x++) {
                    const faceHalf = Math.round(1 + f * 3);
                    const inFace = y > mTop + 3 && y < metro.base - 6 && Math.abs(x - metro.x) <= faceHalf;
                    const lit = x < metro.x ? 0.75 : 0.4;
                    put(x, y, inFace ? ditherPick(paper, 0.3, x, y) : ditherPick(wood, lit + (x === metro.x - half ? 0.2 : 0), x, y));
                }
            }
            for (let x = metro.x - 10; x <= metro.x + 10; x++) {
                put(x, metro.base - 1, wood[2]);
                put(x, metro.base - 2, wood[4]);
            }
            for (let k = 0; k < 7; k++) put(metro.x - 3 + k, mTop + 6 + k * 2, hex('#6a5030'));
        });

        // Each beat the quill writes one note. Pitches come from a seeded walk.
        const perStaff = 7;
        const slots: Array<{x: number; y: number; up: boolean}> = [];
        let pitch = 4;
        for (const px of pages) {
            for (const st of staffTops) {
                for (let n = 0; n < perStaff; n++) {
                    pitch = Math.max(0, Math.min(8, pitch + Math.round((random() - 0.5) * 4)));
                    slots.push({x: px + 9 + n * 4, y: st + 8 - pitch, up: pitch < 4});
                }
            }
        }
        const cycle = slots.length + 10;
        const ink = hex('#20140c');

        return (ctx, t, beat) => {
            const tick = pulse(beat);
            ctx.drawImage(back.canvas, 0, 0);

            const pos = ((beat % cycle) + cycle) % cycle;
            const written = Math.min(slots.length, Math.floor(pos) + 1);
            const fading = pos > slots.length ? 1 - (pos - slots.length) / 8 : 1;

            // Notes on the page.
            for (let i = 0; i < written; i++) {
                const s = slots[i];
                const fresh = i === written - 1 && pos < slots.length ? Math.min(1, (pos - i) * 3) : 1;
                const a = Math.max(0, fading) * fresh;
                if (a <= 0) continue;
                ctx.fillStyle = css(ink, a);
                ctx.fillRect(s.x, s.y, 2, 2);
                if (s.up) ctx.fillRect(s.x + 1, s.y - 5, 1, 5);
                else ctx.fillRect(s.x, s.y + 2, 1, 5);
            }
            // A bar line after the fourth note of each staff.
            for (let i = 3; i < written - 1; i += perStaff) {
                const st = staffTops[Math.floor(i / perStaff) % staffTops.length];
                ctx.fillStyle = css(ink, 0.5 * Math.max(0, fading));
                ctx.fillRect(slots[i].x + 3, st, 1, 9);
            }

            // The quill glides to the newest note and dips as it writes.
            if (pos < slots.length + 1) {
                const i = Math.min(slots.length - 1, Math.floor(pos));
                const next = slots[Math.min(slots.length - 1, i + 1)];
                const cur = slots[i];
                const f = pos - Math.floor(pos);
                const move = f > 0.6 ? (f - 0.6) / 0.4 : 0;
                const ease = move * move * (3 - 2 * move);
                const nx = Math.round(cur.x + 2 + (next.x - cur.x) * ease);
                const ny = Math.round(cur.y + 1 + (next.y - cur.y) * ease - Math.sin(move * Math.PI) * 3 - (f < 0.2 ? 0 : 1));
                ctx.fillStyle = '#1a120c';
                ctx.fillRect(nx, ny, 1, 1);
                for (let k = 1; k < 20; k++) {
                    const qx = nx + Math.round(k * 0.55), qy = ny - k;
                    ctx.fillStyle = k < 4 ? '#3a2a1a' : '#d8d0c4';
                    ctx.fillRect(qx, qy, 1, 1);
                    if (k > 4) {
                        const vane = Math.round(Math.sin((k - 4) / 15 * Math.PI) * 3);
                        ctx.fillStyle = 'rgba(244,238,226,0.85)';
                        ctx.fillRect(qx - vane, qy, vane, 1);
                        ctx.fillStyle = 'rgba(200,190,176,0.8)';
                        ctx.fillRect(qx + 1, qy, Math.max(0, vane - 1), 1);
                    }
                }
            }

            // Metronome arm swings to an end on every beat.
            const angle = 0.42 * Math.cos(beat * Math.PI);
            const pivotY = metro.base - 6;
            ctx.fillStyle = '#c8b898';
            for (let k = 0; k < 26; k++) {
                ctx.fillRect(Math.round(metro.x + Math.sin(angle) * k), Math.round(pivotY - Math.cos(angle) * k), 1, 1);
            }
            const wx = Math.round(metro.x + Math.sin(angle) * 15), wy = Math.round(pivotY - Math.cos(angle) * 15);
            ctx.fillStyle = '#e0b850';
            ctx.fillRect(wx - 1, wy - 1, 3, 3);
            ctx.fillStyle = '#7a5418';
            ctx.fillRect(wx - 1, wy + 1, 3, 1);
            ctx.fillStyle = '#3a2408';
            ctx.fillRect(metro.x - 1, pivotY, 3, 2);

            // Candle flame flickers; its glow breathes with the tick.
            const flick = Math.sin(t * 9) * 0.5 + Math.sin(t * 13.7) * 0.3 + (hash(Math.floor(t * 12), 3) - 0.5) * 0.4;
            const lean = Math.round(Math.sin(t * 1.3) * 0.8);
            const fy = candle.y - 2;
            ctx.fillStyle = '#ff9a2a';
            ctx.fillRect(candle.x - 1, fy - 3, 3, 3);
            ctx.fillStyle = '#ffd25a';
            ctx.fillRect(candle.x, fy - 4 + (flick > 0.3 ? -1 : 0), 1, 4);
            ctx.fillRect(candle.x + lean, fy - 6 + (flick > 0.3 ? -1 : 0), 1, 2);
            ctx.fillStyle = '#fff6d0';
            ctx.fillRect(candle.x, fy - 2, 1, 2);

            ctx.globalCompositeOperation = 'lighter';
            const r = 46 + flick * 3;
            const g = ctx.createRadialGradient(candle.x, fy - 3, 1, candle.x, fy - 3, r);
            g.addColorStop(0, `rgba(255,170,80,${(0.32 + 0.05 * flick + 0.05 * tick).toFixed(3)})`);
            g.addColorStop(0.3, 'rgba(255,140,60,0.08)');
            g.addColorStop(1, 'rgba(255,140,60,0)');
            ctx.fillStyle = g;
            ctx.fillRect(candle.x - r, fy - 3 - r, r * 2, r * 2);
            ctx.globalAlpha = 0.05 + 0.03 * tick;
            const room = ctx.createRadialGradient(candle.x, fy, 2, candle.x, fy, W * 0.7);
            room.addColorStop(0, 'rgba(255,190,110,1)');
            room.addColorStop(1, 'rgba(255,190,110,0)');
            ctx.fillStyle = room;
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        };
    }
};
