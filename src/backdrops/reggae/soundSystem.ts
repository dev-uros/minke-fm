import {bayer, Backdrop, css, ditherPick, hex, pixels, pulse, RGB, rng, wrappingNoise} from '../pixel';
import {drawPalm, glowSprite, Palm} from './fx';

/**
 * An outdoor dance at night: a wall of home-built speaker boxes in front of a
 * painted zinc fence, bass cones thumping on the beat and the mids skanking
 * on the offbeat, string lights overhead and smoke drifting through red, gold
 * and green light.
 */
export const SOUND_SYSTEM: Backdrop = {
    id: 'reggae-sound-system',
    name: 'Sound system',
    bpm: 80,
    create(W, H) {
        const random = rng(77);
        const ground = Math.round(H * 0.82);
        const cx = Math.round(W / 2);
        const sky = ['#05030a', '#0b0614', '#140a1c', '#1e0f22'].map(hex);
        const lights: RGB[] = [hex('#ff3030'), hex('#ffc020'), hex('#30d050')];

        // Boxes: [x, y, w, h, kind]. Two tall centre stacks and two shorter outer ones.
        type Box = {x: number; y: number; w: number; h: number; kind: 'bass' | 'mid' | 'horn'};
        const boxes: Box[] = [];
        const BW = 34;
        const stack = (x: number, kinds: Box['kind'][]) => {
            let y = ground;
            for (const kind of kinds) {
                const h = kind === 'bass' ? 30 : kind === 'mid' ? 20 : 12;
                y -= h;
                boxes.push({x, y, w: BW, h, kind});
            }
        };
        stack(cx - 6 - BW, ['bass', 'bass', 'mid', 'horn']);
        stack(cx + 6, ['bass', 'bass', 'mid', 'horn']);
        stack(cx - 8 - BW * 2, ['bass', 'bass', 'horn']);
        stack(cx + 8 + BW, ['bass', 'bass', 'horn']);

        const back = pixels(W, H, put => {
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, y / ground, x, y));
            for (let i = 0; i < 50; i++) put(random() * W, random() * ground * 0.4, hex('#b0a0c0'), 50 + random() * 120);
            // Zinc fence: corrugated sheets, painted in faded bands.
            const fenceTop = ground - 46;
            const bands = [hex('#5a1a1a'), hex('#6a5418'), hex('#1a4a26')];
            for (let x = 0; x < W; x++) {
                const sheetTop = fenceTop + ((Math.floor(x / 22) * 7) % 5);
                for (let y = sheetTop; y < ground; y++) {
                    const band = bands[Math.min(2, Math.floor(((y - fenceTop) / (ground - fenceTop)) * 3))];
                    const ridge = x % 3 === 0 ? 0.7 : 1;
                    const shade = 0.55 + 0.45 * ((y - sheetTop) / (ground - sheetTop));
                    const f = 0.6 * ridge * shade * (bayer(x, y) < 0.15 ? 0.8 : 1);
                    put(x, y, [band[0] * f, band[1] * f, band[2] * f]);
                }
                if (x % 22 === 0) for (let y = sheetTop; y < ground; y++) put(x, y, hex('#0c080c'));
            }
            for (let y = ground; y < H; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick([hex('#2a1a16'), hex('#1a100e'), hex('#0c0808')], (y - ground) / (H - ground), x, y));
        });

        // The boxes themselves; cones are drawn per frame on top.
        const wood = pixels(W, H, put => {
            const body = hex('#1c1416'), edge = hex('#3e2c26'), corner = hex('#8a7a5a'), grille = hex('#120c0e');
            for (const b of boxes) {
                for (let y = b.y; y < b.y + b.h; y++) {
                    for (let x = b.x; x < b.x + b.w; x++) {
                        const border = x === b.x || y === b.y || x === b.x + b.w - 1 || y === b.y + b.h - 1;
                        const inner = x === b.x + 1 || y === b.y + 1 || x === b.x + b.w - 2 || y === b.y + b.h - 2;
                        put(x, y, border ? grille : inner ? edge : body);
                    }
                }
                for (const [x, y] of [[b.x, b.y], [b.x + b.w - 2, b.y], [b.x, b.y + b.h - 2], [b.x + b.w - 2, b.y + b.h - 2]]) {
                    put(x, y, corner); put(x + 1, y, corner); put(x, y + 1, corner); put(x + 1, y + 1, corner);
                }
                if (b.kind === 'horn') {
                    for (const hx of [b.x + 4, b.x + b.w / 2 + 1]) {
                        for (let y = b.y + 3; y < b.y + b.h - 3; y++)
                            for (let x = hx; x < hx + 12; x++) {
                                const rim = y === b.y + 3 || y === b.y + b.h - 4 || x === hx || x === hx + 11;
                                put(x, y, rim ? hex('#6a5a40') : hex('#060406'));
                            }
                    }
                }
            }
        });

        // Cone sprites: four excursion levels, the most pushed one bulging out.
        const cone = (r: number, k: number) => pixels(2 * r + 3, 2 * r + 3, put => {
            const c = r + 1;
            const surround = hex('#2e2628'), hi = hex('#8a7c70');
            const body = ['#4a3e3c', '#362c2c', '#221a1c'].map(hex);
            const rr = r + (k === 3 ? 1 : 0);
            for (let y = -rr; y <= rr; y++) {
                for (let x = -rr; x <= rr; x++) {
                    const d = Math.hypot(x, y);
                    if (d > rr + 0.3) continue;
                    let col: RGB;
                    if (d > rr - 1.2) col = (y < 0 && k >= 2) ? hi : surround;
                    else if (d < r * 0.32 + k * 0.5) col = (x === -1 && y === -1) || (k >= 2 && x + y < -1) ? hex('#a89888') : hex('#5a4c46');
                    else col = ditherPick(body, (d / r) * (1 - k * 0.15), x + c, y + c);
                    put(x + c, y + c, col);
                }
            }
        });
        const bassCones = [0, 1, 2, 3].map(k => cone(12, k).canvas);
        const midCones = [0, 1, 2, 3].map(k => cone(6, k).canvas);

        const haze = (() => {
            const big = wrappingNoise(W, H, 34, random), small = wrappingNoise(W, H, 11, random);
            return lights.map(col => pixels(W, H, put => {
                for (let y = 0; y < H; y++)
                    for (let x = 0; x < W; x++) {
                        const v = (big(x, y) * 0.7 + small(x, y) * 0.3) * (0.45 + 0.55 * (y / H));
                        if (v > 0.3 + bayer(x, y) * 0.45) put(x, y, col);
                    }
            }).canvas);
        })();
        const pool = lights.map(col => glowSprite(60, col, 0.9));

        const palms: Palm[] = [
            {x: Math.round(W * 0.04), base: ground - 30, height: 90, lean: 10, frond: 26, girth: 4, phase: 0.4},
            {x: Math.round(W * 0.97), base: ground - 30, height: 80, lean: -12, frond: 24, girth: 4, phase: 2.2}
        ];

        // Two strings of bulbs sagging across the yard.
        const strings = [{y0: 10, sag: 16, step: 9}, {y0: 26, sag: 12, step: 11}].map(s => {
            const bulbs: Array<{x: number; y: number; c: number}> = [];
            for (let x = 2, i = 0; x < W; x += s.step, i++) {
                const u = x / W;
                bulbs.push({x, y: Math.round(s.y0 + Math.sin(u * Math.PI) * s.sag), c: i % 3});
            }
            return {...s, bulbs};
        });

        // A packed crowd seen from behind, heads and shoulders along the bottom.
        const crowd = Array.from({length: Math.ceil(W / 9) + 1}, (_, i) => ({
            x: i * 9 - 4 + Math.floor(random() * 3),
            y: H - 19 - Math.floor(random() * 5),
            phase: random() < 0.6 ? 0 : 0.5,
            arm: random() < 0.15 ? (random() < 0.5 ? -1 : 1) : 0,
            hat: random() < 0.3
        }));

        return (ctx, t, beat) => {
            const kick = pulse(beat);
            const skank = pulse(beat + 0.5);
            const bar = Math.floor(beat / 4);
            const main = bar % 3;

            ctx.drawImage(back.canvas, 0, 0);
            for (const palm of palms) drawPalm(ctx, palm, t, '#06040a', null, 0.6);

            // Coloured wash on the fence and floor.
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.5 + 0.4 * kick;
            ctx.drawImage(pool[main], cx - 60 - Math.round(W * 0.22), ground - 70);
            ctx.globalAlpha = 0.45 + 0.35 * skank;
            ctx.drawImage(pool[(main + 1) % 3], cx - 60 + Math.round(W * 0.22), ground - 70);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';

            // The stack shudders a pixel on the kick.
            const shake = kick > 0.7 ? 1 : 0;
            ctx.drawImage(wood.canvas, 0, -shake);
            const level = (v: number) => Math.min(3, Math.floor(v * 4));
            for (const b of boxes) {
                const y = b.y - shake;
                if (b.kind === 'bass') {
                    const s = bassCones[level(kick)];
                    ctx.drawImage(s, Math.round(b.x + b.w / 2 - 13), Math.round(y + b.h / 2 - 13));
                } else if (b.kind === 'mid') {
                    const s = midCones[level(skank)];
                    ctx.drawImage(s, b.x + 2, Math.round(y + b.h / 2 - 7));
                    ctx.drawImage(s, b.x + b.w - 17, Math.round(y + b.h / 2 - 7));
                }
            }
            // Tiny level meters on top of the centre stacks.
            for (const sx of [cx - 6 - BW + 4, cx + 6 + 4]) {
                const top = boxes.find(b => b.kind === 'horn' && b.x === sx - 4)!.y - shake;
                const n = 2 + Math.round(kick * 4 + Math.sin(t * 9 + sx) * 0.8);
                for (let i = 0; i < 6; i++) {
                    ctx.fillStyle = i >= n ? '#1a1214' : i > 4 ? '#ff3030' : i > 2 ? '#ffc020' : '#30d050';
                    ctx.fillRect(sx + i * 3, top - 3, 2, 2);
                }
            }

            // Smoke, lit by the colour of the bar.
            const drift = Math.floor(t * 4) % W;
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.07 + 0.05 * kick;
            ctx.drawImage(haze[main], -drift, 0);
            ctx.drawImage(haze[main], W - drift, 0);
            ctx.globalAlpha = 0.04;
            ctx.drawImage(haze[(main + 2) % 3], drift - W, 0);
            ctx.drawImage(haze[(main + 2) % 3], drift, 0);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';

            // String lights: wire, then bulbs chasing round the three colours.
            for (const s of strings) {
                ctx.fillStyle = '#0a0608';
                for (let x = 0; x < W; x++) ctx.fillRect(x, Math.round(s.y0 + Math.sin((x / W) * Math.PI) * s.sag) - 1, 1, 1);
                for (const b of s.bulbs) {
                    const on = b.c === Math.floor(beat) % 3;
                    const col = lights[b.c];
                    ctx.fillStyle = css(col, on ? 0.3 + 0.3 * kick : 0.12);
                    ctx.fillRect(b.x - 1, b.y - 1, 4, 4);
                    ctx.fillStyle = css(col, on ? 1 : 0.6);
                    ctx.fillRect(b.x, b.y, 2, 2);
                }
            }

            // The crowd, black against the light, skanking on the offbeat.
            for (const p of crowd) {
                const bob = Math.round(Math.max(0, Math.sin((beat + 0.5 + p.phase) * Math.PI * 2)) * 2);
                const y = p.y + bob;
                ctx.fillStyle = '#030204';
                ctx.fillRect(p.x + 3, y, 4, 5);
                ctx.fillRect(p.x + 2, y + 1, 6, 3);
                if (p.hat) ctx.fillRect(p.x + 1, y, 8, 1);
                ctx.fillRect(p.x + 4, y + 5, 2, 1);
                ctx.fillRect(p.x + 1, y + 6, 8, 1);
                ctx.fillRect(p.x, y + 7, 10, H - y);
                if (p.arm) {
                    const ax = p.arm < 0 ? p.x - 1 : p.x + 10;
                    ctx.fillRect(ax, y - 4, 1, 12);
                }
                ctx.fillStyle = css(lights[main], 0.5);
                ctx.fillRect(p.x + 3, y, 4, 1);
                ctx.fillRect(p.x + 1, y + 6, 2, 1);
            }
        };
    }
};
