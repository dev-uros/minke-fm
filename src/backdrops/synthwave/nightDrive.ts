import {Backdrop, css, disc, ditherPick, hex, pixels, pulse, rng} from '../pixel';
import {paintWindows, skyline} from '../skyline';

/**
 * Night drive: following behind a low wedge-shaped sports car down an empty
 * highway towards a neon city, lane dashes and street lamps rushing past and
 * the tail lights glowing on the beat.
 */
export const NIGHT_DRIVE: Backdrop = {
    id: 'synthwave-night-drive',
    name: 'Night drive',
    bpm: 100,
    create(W, H) {
        const random = rng(17);
        const cx = Math.round(W / 2);
        const horizon = Math.round(H * 0.5);
        const depth = H - horizon;
        const roadHalf = (y: number) => 3 + (W * 0.62 - 3) * (y - horizon) / depth;

        // Sky, moon and the city on the horizon.
        const back = pixels(W, H, put => {
            const sky = ['#07031a', '#140632', '#2a0b4e', '#4a1366', '#7a1f74', '#b8347a', '#ff5a8a'].map(hex);
            for (let y = 0; y < horizon; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, Math.pow(y / horizon, 1.4), x, y));
            for (let i = 0; i < 70; i++) put(random() * W, random() * horizon * 0.5, hex('#ffffff'), 50 + random() * 170);
            const mx = Math.round(cx - W * 0.24), my = 28;
            disc(put, mx, my, 10, (x, y) => ditherPick(['#ffe0f0', '#ffb0d8', '#ff7ac0'].map(hex), (y - my + 10) / 20, x, y));
            disc(put, mx + 5, my - 3, 9, (x, y) => ditherPick(sky, Math.pow(y / horizon, 1.4), x, y));
        });
        const city = back.ctx;
        skyline(city, {
            from: 0, to: W, base: horizon, minHeight: 14, maxHeight: 40, minWidth: 6, maxWidth: 14,
            colour: '#2a0d4a', lit: ['rgba(255,90,200,0.35)'], litChance: 0.1
        }, random).forEach(w => {
            city.fillStyle = w.colour;
            city.fillRect(w.x, w.y, w.w, w.h);
        });
        // A cluster of towers right ahead, at the end of the road.
        const towers: Array<{x: number, w: number, h: number, edge: string}> = [];
        for (let i = 0; i < 7; i++) {
            const w = 6 + Math.floor(random() * 8);
            const x = Math.round(cx - 40 + i * 12 + random() * 4 - w / 2);
            const h = Math.round((48 - Math.abs(i - 3) * 9) * (0.7 + random() * 0.4));
            towers.push({x, w, h, edge: i % 2 ? '#3df2ff' : '#ff4fd8'});
        }
        for (const tw of towers) {
            city.fillStyle = '#16072c';
            city.fillRect(tw.x, horizon - tw.h, tw.w, tw.h);
            city.fillStyle = tw.edge;
            city.fillRect(tw.x, horizon - tw.h, 1, tw.h);
            city.fillRect(tw.x, horizon - tw.h, tw.w, 1);
        }
        const lit = skyline(city, {
            from: 0, to: W, base: horizon, minHeight: 4, maxHeight: 18, minWidth: 8, maxWidth: 18,
            colour: '#0e0420', lit: ['#ff4fd8', '#3df2ff', '#ffd36b'], litChance: 0.3, grid: [3, 3, 1, 1]
        }, random);

        // Ground and road surface.
        const ground = pixels(W, H, put => {
            const fields = ['#200a3a', '#140628', '#0b0318'].map(hex);
            const asphalt = ['#2a1840', '#1e1030', '#150a24'].map(hex);
            for (let y = horizon; y < H; y++) {
                const v = (y - horizon) / depth;
                const half = roadHalf(y);
                for (let x = 0; x < W; x++) {
                    const d = Math.abs(x - cx);
                    if (d <= half) {
                        const edge = d > half - Math.max(1, half * 0.02);
                        put(x, y, edge ? hex('#3df2ff') : ditherPick(asphalt, Math.pow(v, 0.6), x, y));
                    } else put(x, y, ditherPick(fields, Math.pow(v, 0.5), x, y));
                }
            }
            for (let x = 0; x < W; x++) put(x, horizon, hex('#ff7ac0'));
        });

        // The car from behind, as a sprite.
        const CW = 70, CH = 30;
        const car = pixels(CW, CH, put => {
            const body = hex('#22113a'), rim = hex('#ff5fd0'), dark = hex('#0e0618'), tyre = hex('#05030a');
            for (let y = 22; y < 30; y++) {
                for (let x = 4; x < 15; x++) put(x, y, tyre);
                for (let x = 55; x < 66; x++) put(x, y, tyre);
            }
            // Cabin: a trapezoid narrowing to the roof.
            for (let y = 1; y < 12; y++) {
                const inset = Math.round(16 - (y - 1) * 0.75);
                for (let x = inset; x < CW - inset; x++) {
                    const glass = y > 2 && x > inset + 2 && x < CW - inset - 3;
                    let c = glass ? hex('#0c0822') : body;
                    if (glass && (x - y * 2) % 23 < 3) c = hex('#2a2258');
                    if (glass && y === 9) c = hex('#ff4fd8');
                    if (glass && y === 8 && (x * 7) % 5 === 0) c = hex('#3df2ff');
                    if (y === 1) c = rim;
                    put(x, y, c);
                }
                put(Math.round(16 - (y - 1) * 0.75), y, rim);
            }
            // Body, tail-light bar, plate and bumper.
            for (let y = 12; y < 24; y++)
                for (let x = 1; x < CW - 1; x++) {
                    let c = body;
                    if (y === 12) c = rim;
                    if (y === 13 && (x < 3 || x > CW - 4)) c = dark;
                    if (y >= 15 && y <= 18 && x >= 4 && x < CW - 4) c = (x - 4) % 6 === 5 ? hex('#7a0a20') : hex('#ff2a4a');
                    if (y >= 15 && y <= 18 && x >= 29 && x < 41) c = dark;
                    if (y >= 19 && y <= 22 && x >= 29 && x < 41) c = y === 19 || y === 22 ? dark : hex('#c8bce0');
                    if (y >= 21) c = c === body ? dark : c;
                    if (y === 21 && (x < 26 || x > 43)) c = hex('#3a2058');
                    put(x, y, c);
                }
            for (const ex of [18, 49]) {
                put(ex, 24, hex('#6a5a80'));
                put(ex + 1, 24, hex('#6a5a80'));
            }
        });

        const lampGlow = hex('#ffb37a');
        const tail = hex('#ff2a4a');
        let travel = 0, last = 0;
        const SPEED = 9;

        const project = (z: number) => horizon + depth / z;

        return (ctx, t, beat) => {
            const dt = Math.min(0.1, Math.max(0, t - last));
            last = t;
            travel += dt * SPEED;
            const kick = pulse(beat);

            ctx.drawImage(back.canvas, 0, 0);
            paintWindows(ctx, lit, t);
            // Aviation lights on the tallest towers.
            ctx.fillStyle = Math.floor(t * 1.2) % 2 ? '#ff2a4a' : '#5a0a1a';
            for (const tw of towers.slice(2, 5)) ctx.fillRect(tw.x + (tw.w >> 1), horizon - tw.h - 1, 1, 1);
            ctx.fillStyle = css(hex('#ff4fd8'), 0.12 + 0.12 * kick);
            ctx.fillRect(0, horizon - 3, W, 3);

            ctx.drawImage(ground.canvas, 0, 0);

            // Lane dashes: each screen row maps to a distance down the road.
            for (let y = horizon + 2; y < H; y++) {
                const z = depth / (y - horizon);
                if ((((z + travel) % 4) + 4) % 4 > 1.8) continue;
                const half = roadHalf(y);
                const w = Math.max(1, Math.round(half * 0.025));
                ctx.fillStyle = css(hex('#ff7ac0'), Math.min(1, 0.4 + (y - horizon) / depth));
                ctx.fillRect(Math.round(cx - half / 3 - w / 2), y, w, 1);
                ctx.fillRect(Math.round(cx + half / 3 - w / 2), y, w, 1);
            }

            // Street lamps on both sides, from far to near.
            const gap = 7;
            const first = Math.ceil((travel + 0.35) / gap) * gap;
            for (let k = 9; k >= 0; k--) {
                const z = first + k * gap - travel;
                if (z < 0.35) continue;
                const gy = project(z);
                const s = (gy - horizon) / depth;
                const half = roadHalf(gy);
                const poleH = Math.round(s * 110), arm = Math.round(s * 22);
                for (const side of [-1, 1]) {
                    const px = Math.round(cx + side * half * 1.18);
                    ctx.fillStyle = '#0a0414';
                    ctx.fillRect(px, Math.round(gy - poleH), Math.max(1, Math.round(s * 3)), poleH);
                    ctx.fillRect(side < 0 ? px : px - arm, Math.round(gy - poleH), arm, Math.max(1, Math.round(s * 2)));
                    const lx = side < 0 ? px + arm : px - arm;
                    const ly = Math.round(gy - poleH + Math.max(1, s * 2));
                    ctx.fillStyle = css(lampGlow, 0.2);
                    const gr = Math.max(1, Math.round(s * 6));
                    ctx.fillRect(lx - gr, ly - gr + 1, gr * 2, gr * 2);
                    ctx.fillStyle = css(hex('#fff0d8'));
                    ctx.fillRect(lx - Math.max(1, Math.round(s * 3)), ly, Math.max(1, Math.round(s * 6)), Math.max(1, Math.round(s * 1.5)));
                    // A pool of light on the road beneath.
                    ctx.fillStyle = css(lampGlow, 0.07);
                    ctx.fillRect(Math.round(lx - s * 30), Math.round(gy - s * 3), Math.round(s * 60), Math.max(1, Math.round(s * 6)));
                }
            }

            // Another car far ahead.
            const ax = Math.round(cx + Math.sin(t * 0.21 + 1) * 6);
            ctx.fillStyle = '#0e0618';
            ctx.fillRect(ax - 3, horizon + 7, 7, 3);
            ctx.fillStyle = css(tail, 0.9);
            ctx.fillRect(ax - 3, horizon + 8, 1, 1);
            ctx.fillRect(ax + 3, horizon + 8, 1, 1);

            // Our car, gently swaying across the lane, bumping now and then.
            const sway = Math.round(Math.sin(t * 0.35) * 5);
            const bump = Math.sin(t * 11) > 0.92 ? 1 : 0;
            const carX = cx - CW / 2 + sway, carY = H - CH - 6 - bump;
            ctx.globalCompositeOperation = 'lighter';
            const glow = ctx.createRadialGradient(cx + sway, carY + 17, 2, cx + sway, carY + 17, 46);
            glow.addColorStop(0, css(tail, 0.35 + 0.25 * kick));
            glow.addColorStop(1, css(tail, 0));
            ctx.fillStyle = glow;
            ctx.fillRect(0, horizon, W, H - horizon);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(carX + 2, H - 7, CW - 4, 2);
            ctx.drawImage(car.canvas, carX, carY);
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = css(hex('#ff8a9a'), 0.15 + 0.35 * kick);
            ctx.fillRect(carX + 4, carY + 16, 25, 2);
            ctx.fillRect(carX + 41, carY + 16, CW - 45, 2);
            ctx.globalCompositeOperation = 'source-over';
        };
    }
};
