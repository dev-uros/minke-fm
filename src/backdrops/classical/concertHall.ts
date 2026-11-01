import {Backdrop, css, ditherPick, hash, hex, pixels, pulse, rng, RGB} from '../pixel';
import {fillPoly} from './draw';

/**
 * An empty concert hall before the performance: red velvet curtains drawn back
 * from a gilded stage, a grand piano in a spotlight that swells and settles,
 * and a chandelier whose crystals glint above the dark rows of seats.
 */
export const CONCERT_HALL: Backdrop = {
    id: 'classical-concert-hall',
    name: 'Concert hall',
    bpm: 60,
    create(W, H) {
        const random = rng(41);
        const cx = Math.round(W / 2);
        const left = Math.round(W * 0.17), right = W - left;
        const archTop = 42, floorBack = 110, floorFront = 128, apron = 133;

        const wallPal = ['#0a0407', '#14070c', '#220b12', '#33111a', '#4a1a20'].map(hex);
        const backPal = ['#050304', '#0c0608', '#160a0c', '#22100f'].map(hex);
        const woodPal = ['#1c0f08', '#2e1a0e', '#4a2c16', '#6e4420', '#93602e'].map(hex);
        const red = ['#1e0306', '#3a070c', '#640e16', '#921a22', '#c0302e', '#e0584a'].map(hex);
        const gold = ['#3a2408', '#6e4a14', '#a87a26', '#e0b850', '#fff0a0'].map(hex);

        // Curtain half-width at a given height: draped to a tie-back, then flaring to the floor.
        const curtainTop = W * 0.15, curtainTie = W * 0.045, curtainFloor = W * 0.085;
        const tieF = 0.55;
        const curtainW = (y: number) => {
            const f = (y - archTop) / (floorFront - archTop);
            if (f < tieF) return curtainTop - (curtainTop - curtainTie) * Math.sin((f / tieF) * Math.PI / 2);
            return curtainTie + (curtainFloor - curtainTie) * Math.pow((f - tieF) / (1 - tieF), 0.8);
        };

        // The hall, the stage behind the arch and its floor.
        const back = pixels(W, H, put => {
            for (let y = 0; y < apron; y++) {
                for (let x = 0; x < W; x++) {
                    const inside = x >= left && x < right && y >= archTop;
                    if (!inside) {
                        // Hall wall, a little warmer near the stage; pilasters every so often.
                        const near = 1 - Math.min(1, Math.abs(x - cx) / (W * 0.6));
                        const pil = Math.abs(((x - cx) % 34 + 34) % 34 - 17) < 2 ? 0.12 : 0;
                        put(x, y, ditherPick(wallPal, near * 0.55 + (y / apron) * 0.35 + pil, x, y));
                    } else if (y < floorBack) {
                        const fold = 0.5 + 0.5 * Math.sin(x * 0.55);
                        put(x, y, ditherPick(backPal, ((y - archTop) / (floorBack - archTop)) * 0.6 + fold * 0.3, x, y));
                    } else if (y < floorFront) {
                        const lit = 1 - Math.min(1, Math.abs(x - cx) / (W * 0.4));
                        const plank = (y - floorBack) % 4 === 0 ? -0.15 : 0;
                        put(x, y, ditherPick(woodPal, 0.25 + lit * 0.5 + ((y - floorBack) / 18) * 0.2 + plank, x, y));
                    } else {
                        put(x, y, y === floorFront ? woodPal[4] : woodPal[0]);
                    }
                }
            }
            // The stage front runs the whole width under the arch.
            for (let x = left - 6; x < right + 6; x++) {
                for (let y = floorFront; y < apron; y++) put(x, y, y === floorFront ? woodPal[3] : woodPal[0]);
            }
        });

        // A grand piano seen side-on, keyboard to the left, lid raised.
        const piano = pixels(W, H, put => {
            const x0 = cx - 22, top = 100, base = 106, foot = 119;
            const black: RGB = hex('#07060a'), gloss: RGB = hex('#3c3646'), shine: RGB = hex('#8a8098');
            // Lid.
            fillPoly(put, [[x0 + 7, top], [x0 + 12, top - 4], [x0 + 38, top - 21], [x0 + 45, top - 17], [x0 + 46, top]],
                (x, y) => (y === Math.round(top - 4 - (x - x0 - 12) * 17 / 26) ? gloss : black));
            for (let k = 0; k <= 26; k++) put(x0 + 12 + k, Math.round(top - 4 - k * 17 / 26), k % 5 === 2 ? shine : gloss);
            // Prop stick.
            for (let k = 0; k < 10; k++) put(x0 + 33 + Math.round(k * 0.2), top - 1 - k, gloss);
            // Case, rounded at the tail.
            for (let y = top; y < base; y++) {
                const tail = y === top || y === base - 1 ? 2 : 0;
                for (let x = x0; x <= x0 + 46 - tail; x++) put(x, y, y === top ? gloss : black);
            }
            for (let x = x0 + 3; x < x0 + 40; x++) put(x, top + 2, hex('#1a1720'));
            // Keyboard and music desk.
            for (let x = x0 - 5; x < x0; x++) {
                put(x, top + 1, hex('#e8e0d0'));
                put(x, top + 2, black);
                put(x, top + 3, black);
            }
            for (let y = top - 5; y < top; y++) put(x0 + 4, y, gloss);
            for (let y = top - 5; y < top; y++) put(x0 + 5, y, black);
            put(x0 + 5, top - 5, hex('#d8d0c0'));
            put(x0 + 4, top - 4, hex('#d8d0c0'));
            // Legs with brass casters, and the pedal lyre.
            for (const lx of [x0 + 1, x0 + 22, x0 + 41]) {
                for (let y = base; y < foot; y++) {
                    put(lx, y, black);
                    put(lx + 1, y, y < base + 2 ? black : gloss);
                }
                put(lx, foot, gold[3]);
                put(lx + 1, foot, gold[2]);
            }
            for (let y = base; y < foot - 1; y++) put(x0 + 10, y, black);
            put(x0 + 9, foot - 1, gold[3]);
            put(x0 + 11, foot - 1, gold[3]);
            // Bench.
            for (let x = x0 - 17; x < x0 - 7; x++) {
                put(x, 109, gloss);
                put(x, 110, black);
                put(x, 111, black);
            }
            for (const bx of [x0 - 16, x0 - 9]) for (let y = 112; y < foot + 1; y++) put(bx, y, black);
        });

        // Curtains, valance, gilded frame and the rows of seats in front.
        const front = pixels(W, H, put => {
            for (let y = archTop; y < floorFront; y++) {
                const w = curtainW(y);
                for (let side = 0; side < 2; side++) {
                    for (let i = 0; i < w; i++) {
                        const x = side === 0 ? left + i : right - 1 - i;
                        const u = i / w;
                        const fold = 0.5 + 0.5 * Math.cos(u * Math.PI * 6 + (y - archTop) * 0.02);
                        const light = 0.25 + 0.55 * fold * (0.6 + 0.4 * u) - (u > 0.94 ? 0.2 : 0);
                        put(x, y, ditherPick(red, light, x, y));
                    }
                }
            }
            // Tie-back ropes.
            const tieY = Math.round(archTop + tieF * (floorFront - archTop));
            for (let side = 0; side < 2; side++) {
                const w = Math.round(curtainW(tieY));
                for (let i = 0; i <= w; i++) {
                    const x = side === 0 ? left + i : right - 1 - i;
                    put(x, tieY, gold[3]);
                    put(x, tieY + 1, gold[1]);
                }
                const tx = side === 0 ? left + w : right - 1 - w;
                for (let k = 0; k < 6; k++) put(tx + (side === 0 ? 1 : -1), tieY + 1 + k, k === 5 ? gold[4] : gold[2]);
            }
            // Scalloped valance along the top of the arch, with a gold fringe.
            for (let x = left; x < right; x++) {
                const s = ((x - left) % 22) / 22;
                const bottom = Math.round(archTop + 7 + 4 * Math.sin(s * Math.PI));
                for (let y = archTop; y <= bottom; y++) {
                    const fold = 0.5 + 0.5 * Math.cos(s * Math.PI * 2);
                    put(x, y, y === bottom ? gold[x % 2 ? 3 : 2] : ditherPick(red, 0.2 + 0.5 * fold + (y - archTop) * 0.02, x, y));
                }
            }
            // Gilded proscenium frame.
            const frame = (x: number, y: number, k: number) => put(x, y, gold[[1, 3, 2, 0][k]]);
            for (let k = 0; k < 4; k++) {
                for (let y = archTop - 4 + k; y < floorFront; y++) {
                    frame(left - 4 + k, y, k);
                    frame(right + 3 - k, y, k);
                }
                for (let x = left - 4 + k; x < right + 4 - k; x++) frame(x, archTop - 4 + k, k);
            }
            // Crest at the top of the arch.
            for (let y = archTop - 8; y < archTop - 4; y++) {
                const half = 1 + (y - archTop + 8) * 2;
                for (let x = cx - half; x <= cx + half; x++) {
                    const edge = x === cx - half || x === cx + half || y === archTop - 8;
                    put(x, y, edge ? gold[3] : gold[(x + y) % 3 === 0 ? 2 : 1]);
                }
            }

            // Rows of seats, bigger as they come closer.
            const seatPal = ['#0b0306', '#1a060b', '#2c0a12', '#4a1420'].map(hex);
            let y = apron + 2;
            for (let row = 0; row < 5 && y < H; row++) {
                const sw = 9 + row * 3, sh = 6 + row * 2;
                const off = (row % 2) * Math.round(sw / 2);
                for (let sx = -sw + off; sx < W + sw; sx += sw + 1) {
                    for (let yy = 0; yy < H - y; yy++) {
                        for (let xx = 0; xx < sw; xx++) {
                            // Rounded corners on the seat backs.
                            if (yy === 0 && (xx === 0 || xx === sw - 1)) continue;
                            const lit = yy === 0 ? 1 : yy === 1 ? 0.7 : 0.25 - Math.min(0.25, yy / sh * 0.25);
                            const stage = 1 - Math.min(1, Math.abs(sx + xx - cx) / (W * 0.7));
                            put(sx + xx, y + yy, ditherPick(seatPal, lit * (0.4 + 0.6 * stage), sx + xx, y + yy));
                        }
                    }
                }
                y += sh;
            }
        });

        // The chandelier: three gilt tiers hung with crystals.
        const chand = {x: cx, y: 0};
        const tiers = [{y: 11, w: 8}, {y: 18, w: 16}, {y: 25, w: 24}];
        const crystals: Array<{x: number; y: number; len: number}> = [];
        tiers.forEach(tr => {
            for (let x = -tr.w; x <= tr.w; x += 2) crystals.push({x: chand.x + x, y: tr.y + 2, len: 1 + Math.floor(random() * 3)});
        });
        crystals.push({x: chand.x, y: 30, len: 4});
        const bulbs = tiers.flatMap(tr => [-tr.w, -tr.w / 2, 0, tr.w / 2, tr.w].map(x => ({x: chand.x + Math.round(x), y: tr.y - 2})));

        const sconces = [Math.round(left / 2), Math.round((right + W) / 2)];
        const sconceGlow = (x: number, y: number, r: number, a: number, ctx: CanvasRenderingContext2D) => {
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, `rgba(255,190,110,${a.toFixed(3)})`);
            g.addColorStop(1, 'rgba(255,190,110,0)');
            ctx.fillStyle = g;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        };

        const motes = Array.from({length: 34}, () => ({u: random() - 0.5, v: random(), speed: 0.01 + random() * 0.02, seed: random() * 100}));

        return (ctx, t, beat) => {
            const beatGlow = pulse(beat);
            // A slow swell over twenty seconds, never quite dark.
            const swell = 0.55 + 0.45 * Math.sin(t * Math.PI * 2 / 20);

            ctx.drawImage(back.canvas, 0, 0);
            ctx.drawImage(piano.canvas, 0, 0);

            // Spotlight cone from the fly tower onto the piano.
            ctx.globalCompositeOperation = 'lighter';
            const coneTop = archTop + 4, coneBottom = 120;
            for (let y = coneTop; y < coneBottom; y++) {
                const f = (y - coneTop) / (coneBottom - coneTop);
                const half = 5 + f * 34;
                ctx.fillStyle = css([255, 214, 150], (0.035 + 0.05 * f) * swell + 0.012 * beatGlow);
                ctx.fillRect(Math.round(cx - half), y, Math.round(half * 2), 1);
            }
            // The pool of light on the boards.
            for (let y = 110; y < 125; y++) {
                const dy = (y - 118) / 7;
                const half = Math.sqrt(Math.max(0, 1 - dy * dy)) * 44;
                if (half < 1) continue;
                ctx.fillStyle = css([255, 200, 130], 0.09 * swell);
                ctx.fillRect(Math.round(cx - half), y, Math.round(half * 2), 1);
            }
            // Dust drifting in the beam.
            for (const m of motes) {
                const v = (m.v + t * m.speed) % 1;
                const y = coneTop + 4 + v * (coneBottom - coneTop - 8);
                const half = 5 + ((y - coneTop) / (coneBottom - coneTop)) * 34;
                const x = cx + m.u * half * 1.6 + Math.sin(t * 0.7 + m.seed) * 2;
                const a = (0.25 + 0.35 * Math.sin(t * 1.3 + m.seed)) * swell;
                if (a <= 0) continue;
                ctx.fillStyle = css([255, 236, 200], a);
                ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
            }
            ctx.globalCompositeOperation = 'source-over';

            ctx.drawImage(front.canvas, 0, 0);

            // Wall sconces.
            ctx.globalCompositeOperation = 'lighter';
            for (const sx of sconces) {
                sconceGlow(sx, 78, 14, 0.16 + 0.04 * Math.sin(t * 3 + sx), ctx);
                ctx.fillStyle = '#ffd890';
                ctx.fillRect(sx - 1, 76, 3, 2);
            }
            // Warm halo round the chandelier.
            sconceGlow(chand.x, 18, 34, 0.12 + 0.05 * beatGlow, ctx);
            ctx.globalCompositeOperation = 'source-over';

            // Chain, frame and arms.
            ctx.fillStyle = css(gold[1]);
            ctx.fillRect(chand.x, 0, 1, 9);
            for (const tr of tiers) {
                ctx.fillStyle = css(gold[2]);
                ctx.fillRect(chand.x - tr.w, tr.y, tr.w * 2 + 1, 1);
                ctx.fillStyle = css(gold[0]);
                ctx.fillRect(chand.x - tr.w + 1, tr.y + 1, tr.w * 2 - 1, 1);
            }
            ctx.fillStyle = css(gold[2]);
            ctx.fillRect(chand.x, 9, 1, 20);
            for (const b of bulbs) {
                ctx.fillStyle = css(gold[2]);
                ctx.fillRect(b.x, b.y + 1, 1, 1);
                ctx.fillStyle = '#ffe7a8';
                ctx.fillRect(b.x, b.y, 1, 1);
            }
            // Crystals catch the light now and then.
            const tick = Math.floor(t * 5);
            crystals.forEach((c, i) => {
                for (let k = 0; k < c.len; k++) {
                    ctx.fillStyle = k === c.len - 1 ? '#cfd8ff' : '#8a90b8';
                    ctx.fillRect(c.x, c.y + k, 1, 1);
                }
                const g = hash(i, tick);
                if (g > 0.9 - 0.06 * beatGlow) {
                    const y = c.y + c.len - 1;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(c.x, y, 1, 1);
                    if (g > 0.96) {
                        ctx.fillStyle = 'rgba(255,255,255,0.55)';
                        ctx.fillRect(c.x - 1, y, 1, 1);
                        ctx.fillRect(c.x + 1, y, 1, 1);
                        ctx.fillRect(c.x, y - 1, 1, 1);
                        ctx.fillRect(c.x, y + 1, 1, 1);
                    }
                }
            });
        };
    }
};
