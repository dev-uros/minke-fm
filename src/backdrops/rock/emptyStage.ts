import {Backdrop, bayer, css, ditherPick, hex, pixels, pulse, RGB, rng, wrappingNoise} from '../pixel';
import {ellipse, line, tri} from './draw';

/**
 * An empty rock stage before the band walks on: a drum kit on its riser, amp
 * stacks either side and a lone mic stand. Two spotlights sweep through the
 * smoke, the cymbals glint, and the par cans on the truss hit on the beat.
 */
export const EMPTY_STAGE: Backdrop = {
    id: 'rock-empty-stage',
    name: 'Empty stage',
    bpm: 128,
    create(W, H) {
        const random = rng(41);
        const cx = Math.round(W / 2);
        const trussY = 10;
        const deckTop = Math.round(H * 0.7);
        const deckFront = Math.round(H * 0.87);
        const floorY = deckTop + 6;
        const riserTop = floorY - 7;

        const curtain = ['#060307', '#0e060b', '#190a10', '#281016', '#3a1919'].map(hex);
        const wood = ['#120a07', '#22130c', '#382013', '#54301b'].map(hex);
        const back = pixels(W, H, put => {
            for (let y = 0; y < deckTop; y++) {
                for (let x = 0; x < W; x++) {
                    const fold = 0.5 + 0.5 * Math.sin(x * 0.42 + Math.sin(y * 0.03) * 0.6);
                    const v = 0.08 + 0.5 * (y / deckTop) * (0.4 + 0.6 * fold) + 0.12 * fold;
                    put(x, y, ditherPick(curtain, v, x, y));
                }
            }
            for (let y = deckTop; y < deckFront; y++) {
                const d = (y - deckTop) / (deckFront - deckTop);
                for (let x = 0; x < W; x++) {
                    const plank = (x - cx) / (7 + d * 7);
                    const seam = Math.abs(plank - Math.round(plank)) < 0.07;
                    put(x, y, seam ? wood[0] : ditherPick(wood, 0.25 + 0.55 * d, x, y));
                }
            }
            const front = [hex('#040203'), hex('#0b0607')];
            for (let y = deckFront; y < H; y++)
                for (let x = 0; x < W; x++)
                    put(x, y, y === deckFront ? wood[3] : ditherPick(front, 0.5 * (1 - (y - deckFront) / (H - deckFront)), x, y));
        });
        const g = back.ctx;

        // Truss across the top.
        g.fillStyle = '#2a2427';
        g.fillRect(0, trussY, W, 1);
        g.fillRect(0, trussY + 5, W, 1);
        for (let x = 0; x < W; x += 6) {
            line(g, x, trussY, x + 3, trussY + 5);
            line(g, x + 3, trussY + 5, x + 6, trussY);
        }
        g.fillStyle = '#4a4045';
        g.fillRect(0, trussY, W, 1);

        // Par cans hanging below it.
        const parColours = ['#ffb347', '#ff3b2f', '#ffe2a8', '#ff7a1f'].map(hex);
        const pars: Array<{x: number; colour: RGB}> = [];
        for (let x = 12, i = 0; x < W - 8; x += 22, i++) {
            pars.push({x, colour: parColours[i % parColours.length]});
            g.fillStyle = '#4a4045';
            g.fillRect(x, trussY + 6, 1, 2);
            g.fillStyle = '#151012';
            g.fillRect(x - 2, trussY + 8, 5, 5);
            g.fillStyle = '#2c2427';
            g.fillRect(x - 2, trussY + 8, 5, 1);
        }
        const lensY = trussY + 13;

        // Amp stacks either side; wider windows get a fuller backline.
        const cab = (x: number, y: number, h: number) => {
            g.fillStyle = '#0b0809';
            g.fillRect(x, y, 24, h);
            for (let yy = y + 2; yy < y + h - 2; yy++)
                for (let xx = x + 2; xx < x + 22; xx++) {
                    g.fillStyle = (xx + yy) % 2 ? '#120e0e' : '#1d1717';
                    g.fillRect(xx, yy, 1, 1);
                }
            g.fillStyle = '#8a7b62';
            g.fillRect(x + 1, y + 1, 22, 1);
            g.fillRect(x + 1, y + h - 2, 22, 1);
            g.fillRect(x + 1, y + 1, 1, h - 2);
            g.fillRect(x + 22, y + 1, 1, h - 2);
            g.fillStyle = '#6d6a66';
            for (const [px, py] of [[x, y], [x + 22, y], [x, y + h - 2], [x + 22, y + h - 2]]) g.fillRect(px, py, 2, 2);
        };
        const ampLights: Array<[number, number]> = [];
        const stacks: number[] = [];
        for (let off = 68; cx + off + 24 < W - 4; off += 30) stacks.push(cx - off - 24, cx + off);
        for (const x of stacks) {
            const bottom = floorY - 1;
            cab(x, bottom - 20, 20);
            cab(x, bottom - 40, 20);
            const hy = bottom - 49;
            g.fillStyle = '#0b0809';
            g.fillRect(x, hy, 24, 9);
            g.fillStyle = '#b08d4a';
            g.fillRect(x + 2, hy + 4, 20, 3);
            g.fillStyle = '#1a1414';
            for (let k = 0; k < 6; k++) g.fillRect(x + 4 + k * 3, hy + 5, 1, 1);
            g.fillStyle = '#3a3034';
            g.fillRect(x, hy, 24, 1);
            ampLights.push([x + 20, hy + 2]);
        }

        // Drum riser.
        g.fillStyle = '#120b0d';
        g.fillRect(cx - 48, riserTop, 96, floorY - riserTop);
        g.fillStyle = '#2b1f22';
        g.fillRect(cx - 48, riserTop, 96, 2);

        // The kit.
        const shell = '#8c1c22', shellHi = '#b8343a', head = '#d8ccb0', metal = '#9a9aa0', black = '#060405';
        // Cymbal stands first so drums sit in front.
        const cymbals = [
            {x: cx - 25, y: riserTop - 42, rx: 8, base: cx - 22, crash: true},
            {x: cx + 15, y: riserTop - 47, rx: 7, base: cx + 12, crash: true},
            {x: cx + 32, y: riserTop - 34, rx: 9, base: cx + 36, crash: false}
        ].map(c => ({...c, phase: random() * 10}));
        g.fillStyle = '#4a4a50';
        for (const c of cymbals) line(g, c.x, c.y + 1, c.base, riserTop);
        // Floor tom.
        g.fillStyle = shell;
        g.fillRect(cx + 21, riserTop - 15, 13, 11);
        g.fillStyle = shellHi;
        g.fillRect(cx + 21, riserTop - 15, 2, 11);
        g.fillStyle = head;
        ellipse(g, cx + 27, riserTop - 16, 6, 1);
        g.fillStyle = metal;
        line(g, cx + 22, riserTop - 4, cx + 21, riserTop);
        line(g, cx + 33, riserTop - 4, cx + 34, riserTop);
        // Snare and hi-hat.
        g.fillStyle = metal;
        line(g, cx - 21, riserTop - 12, cx - 21, riserTop);
        g.fillRect(cx - 27, riserTop - 18, 12, 5);
        g.fillStyle = '#5c5b62';
        for (let k = 0; k < 4; k++) g.fillRect(cx - 26 + k * 3, riserTop - 17, 1, 3);
        g.fillStyle = head;
        ellipse(g, cx - 21, riserTop - 19, 6, 0);
        const hat = {x: cx - 37, y: riserTop - 27};
        g.fillStyle = '#4a4a50';
        line(g, hat.x, hat.y, hat.x, riserTop);
        line(g, hat.x - 4, riserTop, hat.x, riserTop - 4);
        line(g, hat.x + 4, riserTop, hat.x, riserTop - 4);
        g.fillStyle = '#a07a28';
        ellipse(g, hat.x, hat.y, 6, 0);
        // Bass drum: red shell, pale front head with a dark emblem.
        const kick = {x: cx, y: riserTop - 12, r: 12};
        for (let y = -kick.r; y <= kick.r; y++)
            for (let x = -kick.r; x <= kick.r; x++) {
                const d = Math.hypot(x, y);
                if (d > kick.r + 0.3) continue;
                let c: string;
                if (d > 10.5) c = x < -3 ? shellHi : shell;
                else if (d > 9.6) c = '#2a0e10';
                else if (d < 4.2) c = d > 3.4 ? '#c9b48a' : '#5a1418';
                else c = css(ditherPick([hex('#efe3c6'), hex('#d8ccb0'), hex('#a89a7c')], (y + 10) / 20, kick.x + x, kick.y + y));
                g.fillStyle = c;
                g.fillRect(kick.x + x, kick.y + y, 1, 1);
            }
        g.fillStyle = metal;
        line(g, kick.x - 9, kick.y + 8, kick.x - 13, riserTop + 1);
        line(g, kick.x + 9, kick.y + 8, kick.x + 13, riserTop + 1);
        // Rack toms on top of the kick.
        for (const [tx, ty] of [[cx - 8, riserTop - 30], [cx + 9, riserTop - 31]]) {
            g.fillStyle = shell;
            g.fillRect(tx - 5, ty, 11, 7);
            g.fillStyle = shellHi;
            g.fillRect(tx - 5, ty, 2, 7);
            g.fillStyle = head;
            ellipse(g, tx, ty - 1, 5, 1);
        }
        g.fillStyle = '#4a4a50';
        line(g, cx, riserTop - 26, cx, riserTop - 24);
        // Static cymbal bodies.
        for (const c of cymbals) {
            g.fillStyle = '#9c7424';
            ellipse(g, c.x, c.y, c.rx, 1);
            g.fillStyle = '#d4ac4a';
            g.fillRect(c.x - c.rx + 2, c.y - 1, c.rx * 2 - 3, 1);
            g.fillStyle = '#3a2e18';
            g.fillRect(c.x, c.y - 1, 1, 1);
        }

        // Wedge monitors and cables on the deck.
        for (const wx of [cx - 40, cx + 28]) {
            for (let k = 0; k < 6; k++) {
                g.fillStyle = k === 0 ? '#2a2224' : '#0c0909';
                g.fillRect(wx + (5 - k), deckFront - 2 - k, 12 + k * 2 - (5 - k), 1);
            }
            g.fillStyle = '#1b1515';
            g.fillRect(wx + 3, deckFront - 5, 9, 2);
        }
        g.fillStyle = '#070405';
        for (const [x0, x1, sag] of [[cx - 70, cx - 34, 5], [cx + 70, cx + 34, 4], [cx - 2, cx - 40, 7]]) {
            for (let k = 0; k <= 60; k++) {
                const f = k / 60;
                g.fillRect(Math.round(x0 + (x1 - x0) * f), Math.round(floorY + 1 + Math.sin(f * Math.PI) * sag + f * 6), 1, 1);
            }
        }

        // Mic stand front and centre, in silhouette against the kick drum.
        g.fillStyle = '#2a2527';
        const mb = deckFront - 3;
        const mTop = deckTop - 30;
        line(g, cx - 6, mb, cx, mb - 4);
        line(g, cx + 6, mb, cx, mb - 4);
        line(g, cx, mb - 4, cx, mTop);
        line(g, cx, mTop, cx - 7, mTop - 4);
        g.fillStyle = '#7a7072';
        line(g, cx + 1, mb - 5, cx + 1, mTop + 2);
        g.fillStyle = black;
        g.fillRect(cx - 1, Math.round((mb + mTop) / 2), 3, 2);
        g.fillStyle = '#2a2628';
        g.fillRect(cx - 9, mTop - 6, 2, 3);
        g.fillStyle = '#6a6468';
        g.fillRect(cx - 9, mTop - 6, 1, 1);

        // Smoke, dithered like the laser club haze.
        const big = wrappingNoise(W, H, 30, random);
        const small = wrappingNoise(W, H, 10, random);
        const haze = pixels(W, H, put => {
            const c = hex('#e0bfa0');
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) {
                    const v = (big(x, y) * 0.7 + small(x, y) * 0.3) * (0.5 + 0.5 * Math.sin((y / H) * Math.PI));
                    if (v > 0.22 + bayer(x, y) * 0.5) put(x, y, c);
                }
        });

        const spots = [
            {x: Math.round(W * 0.08), phase: 0, speed: 0.33},
            {x: Math.round(W * 0.92), phase: 2.4, speed: 0.27}
        ];
        const warm = hex('#ffe9c4');
        const patterns: Array<(i: number, b: number) => boolean> = [
            (i, b) => i % 2 === b % 2,
            (i, b) => i % 4 === b % 4,
            (_i, b) => b % 2 === 0,
            (i, b) => (i < pars.length / 2) === (b % 2 === 0)
        ];

        return (ctx, t, beat) => {
            const k = pulse(beat);
            const b = Math.floor(beat);
            const pattern = patterns[Math.floor(b / 32) % patterns.length];

            ctx.drawImage(back.canvas, 0, 0);

            // Hi-hat top opens and closes on the eighths.
            ctx.fillStyle = '#c79a35';
            ellipse(ctx, hat.x, hat.y - 2 + (Math.floor(beat * 2) % 2), 6, 0);

            ctx.globalCompositeOperation = 'lighter';

            // Par cans: short coloured beams that hit on the beat.
            pars.forEach((p, i) => {
                const on = pattern(i, b);
                const I = on ? 0.25 + 0.75 * k : 0.1;
                const grad = ctx.createLinearGradient(0, lensY, 0, floorY + 4);
                grad.addColorStop(0, css(p.colour, 0.3 * I));
                grad.addColorStop(1, css(p.colour, 0.02 * I));
                ctx.fillStyle = grad;
                tri(ctx, p.x + 0.5, lensY, p.x - 16, floorY + 4, p.x + 17, floorY + 4);
                ctx.fillStyle = css(p.colour, 0.35 + 0.65 * I);
                ctx.fillRect(p.x - 1, lensY - 1, 3, 1);
            });

            // Two follow spots sweep slowly across the stage.
            for (const s of spots) {
                const tx = cx + Math.sin(t * s.speed + s.phase) * W * 0.3;
                const ty = floorY + 6;
                const grad = ctx.createLinearGradient(s.x, trussY, tx, ty);
                grad.addColorStop(0, css(warm, 0.28));
                grad.addColorStop(1, css(warm, 0.07));
                ctx.fillStyle = grad;
                tri(ctx, s.x, trussY + 3, tx - 15, ty, tx + 15, ty);
                ctx.fillStyle = css(warm, 0.08);
                tri(ctx, s.x, trussY + 3, tx - 6, ty, tx + 6, ty);
                ctx.fillStyle = css(warm, 0.1);
                ellipse(ctx, tx, ty, 16, 2);
                ctx.fillStyle = css(warm, 0.9);
                ctx.fillRect(s.x - 1, trussY + 2, 3, 2);
            }

            const drift = Math.floor(t * 2.5) % W;
            ctx.globalAlpha = 0.09 + 0.04 * k;
            ctx.drawImage(haze.canvas, -drift, 0);
            ctx.drawImage(haze.canvas, W - drift, 0);
            ctx.globalAlpha = 1;

            // Cymbals: a glint slides across each, crashes flare on the bar.
            for (const c of cymbals) {
                const span = c.rx * 2 - 2;
                const gx = c.x - c.rx + 1 + Math.floor((t * 7 + c.phase * 5) % span);
                ctx.fillStyle = 'rgba(255,245,210,0.9)';
                ctx.fillRect(gx, c.y - 1, 1, 1);
                ctx.fillStyle = 'rgba(255,230,160,0.4)';
                ctx.fillRect(gx - 1, c.y, 3, 1);
                const hit = c.crash ? (b % 4 === 0 ? pulse(beat) : 0) : k * 0.5;
                if (hit > 0.02) {
                    ctx.fillStyle = css(hex('#ffd76a'), 0.6 * hit);
                    ellipse(ctx, c.x, c.y, c.rx + 1, 1);
                }
            }

            // The kick drum head thumps.
            ctx.fillStyle = css(hex('#ff9a5a'), 0.18 * k);
            ellipse(ctx, kick.x, kick.y, 9, 9);

            for (const [lx, ly] of ampLights) {
                ctx.fillStyle = css(hex('#ff3020'), 0.6 + 0.4 * k);
                ctx.fillRect(lx, ly, 1, 1);
            }
            ctx.globalCompositeOperation = 'source-over';
        };
    }
};
