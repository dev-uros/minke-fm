import {Backdrop, css, ditherPick, hex, pixels, pulse, RGB, rng} from '../pixel';
import {ellipse, line} from './draw';

/**
 * A suburban garage at night with the door rolled up: an amp, a speaker cab
 * and a guitar on its stand, lit by a bare bulb swinging on its cord. Moths
 * circle the bulb and the speaker cones pump on the beat.
 */
export const GARAGE: Backdrop = {
    id: 'rock-garage-night',
    name: 'Garage at night',
    bpm: 100,
    create(W, H) {
        const random = rng(57);
        const cx = Math.round(W / 2);
        const half = Math.min(78, Math.round(W * 0.3));
        const o = {x0: cx - half, x1: cx + half, y0: 50, y1: Math.round(H * 0.8)};
        const inner = {x0: cx - half + 18, x1: cx + half - 18, y1: o.y1 - 16};
        const roofY = 44;

        // Edge of the floor where it meets each wall, in one-point perspective.
        const floorEdge = (x: number) => {
            if (x < inner.x0) return inner.y1 + ((inner.x0 - x) / (inner.x0 - o.x0)) * (o.y1 - inner.y1);
            if (x > inner.x1) return inner.y1 + ((x - inner.x1) / (o.x1 - inner.x1)) * (o.y1 - inner.y1);
            return inner.y1;
        };

        // Everything the bulb lights: the inside of the garage and the driveway.
        const plywood = ['#3a2a1e', '#4e3826', '#62482f'].map(hex);
        const sideWall = ['#2c2018', '#3a2a1e', '#4a3626'].map(hex);
        const concrete = ['#2a2828', '#363332', '#44403d'].map(hex);
        const drive = ['#0e0e12', '#18181c', '#232226'].map(hex);
        const lit = pixels(W, H, put => {
            for (let y = o.y0; y < o.y1; y++)
                for (let x = o.x0; x < o.x1; x++) {
                    const fe = floorEdge(x);
                    if (y >= fe) {
                        const stain = Math.hypot((x - cx - 6) / 14, (y - o.y1 + 7) / 3) < 1;
                        put(x, y, stain ? concrete[0] : ditherPick(concrete, 0.3 + 0.5 * ((y - inner.y1) / (o.y1 - inner.y1)), x, y));
                    } else if (x < inner.x0 || x > inner.x1) {
                        put(x, y, ditherPick(sideWall, 0.3 + 0.3 * Math.sin(y * 0.1), x, y));
                    } else {
                        const hole = (x - inner.x0) % 4 === 2 && (y - o.y0) % 4 === 2 && x > cx + 6;
                        put(x, y, hole ? hex('#2a1c12') : ditherPick(plywood, 0.35 + 0.3 * Math.sin(x * 0.7) * 0.5, x, y));
                    }
                }
            // Driveway, with a hard-edged spill of light out of the opening.
            for (let y = o.y1; y < H; y++) {
                const f = (y - o.y1) / (H - o.y1);
                const dl = o.x0 - f * W * 0.25, dr = o.x1 + f * W * 0.25;
                const sl = o.x0 - f * half * 0.9, sr = o.x1 + f * half * 0.9;
                for (let x = Math.floor(dl); x < dr; x++) {
                    const inSpill = x >= sl && x < sr && f < 0.85;
                    const crack = Math.abs(x - cx - Math.sin(y * 0.4) * 2 - (y - o.y1) * 0.6) < 0.5;
                    put(x, y, crack ? drive[0] : inSpill ? ditherPick(concrete, 0.6 - f * 0.6, x, y) : ditherPick(drive, 0.5 - f * 0.3, x, y));
                }
            }
        });
        const g = lit.ctx;
        // Floor/wall seams.
        g.fillStyle = '#20170f';
        g.fillRect(inner.x0, inner.y1, inner.x1 - inner.x0, 1);
        line(g, inner.x0, inner.y1, o.x0, o.y1);
        line(g, inner.x1, inner.y1, o.x1, o.y1);
        line(g, inner.x0, o.y0, inner.x0, inner.y1);
        line(g, inner.x1, o.y0, inner.x1, inner.y1);

        // Pegboard tools on the right of the back wall.
        g.fillStyle = '#1e1a18';
        const pegX = cx + 10;
        g.fillRect(pegX, o.y0 + 16, 2, 9);
        g.fillRect(pegX - 1, o.y0 + 15, 4, 2);
        g.fillRect(pegX + 6, o.y0 + 15, 1, 11);
        g.fillRect(pegX + 5, o.y0 + 15, 3, 2);
        g.fillRect(pegX + 5, o.y0 + 24, 3, 2);
        g.fillStyle = '#8a3020';
        g.fillRect(pegX + 11, o.y0 + 15, 2, 6);
        g.fillStyle = '#9a9a9a';
        g.fillRect(pegX + 11, o.y0 + 21, 1, 6);
        g.fillStyle = '#5a4a2a';
        ellipse(g, pegX + 20, o.y0 + 20, 4, 4);
        g.fillStyle = '#3a2a1e';
        ellipse(g, pegX + 20, o.y0 + 20, 1, 1);

        // A poster on the left of the back wall: just a lightning bolt.
        const px = inner.x0 + 6, py = o.y0 + 10;
        g.fillStyle = '#141018';
        g.fillRect(px, py, 18, 24);
        g.fillStyle = '#d8c060';
        for (const [a, b, c, d] of [[12, 3, 7, 12], [7, 12, 11, 12], [11, 12, 6, 21]]) line(g, px + a, py + b, px + c, py + d);
        g.fillStyle = '#b02a20';
        g.fillRect(px + 2, py + 2, 2, 2);
        g.fillRect(px + 14, py + 19, 2, 2);

        // Boxes stacked against the left wall.
        for (const [bx, by, bw, bh] of [[o.x0 + 4, o.y1 - 18, 12, 10], [o.x0 + 6, o.y1 - 26, 10, 8]]) {
            g.fillStyle = '#7a5a36';
            g.fillRect(bx, by, bw, bh);
            g.fillStyle = '#5e4428';
            g.fillRect(bx, by + Math.round(bh / 2), bw, 1);
            g.fillStyle = '#93714a';
            g.fillRect(bx, by, bw, 1);
        }

        // Amp head on a 2x12 cab, left of centre. Cones are drawn per frame.
        const amp = {x: cx - 42, y: o.y1 - 34, w: 30, h: 22};
        g.fillStyle = '#0d0b0b';
        g.fillRect(amp.x, amp.y, amp.w, amp.h);
        g.fillStyle = '#2a2424';
        g.fillRect(amp.x, amp.y, amp.w, 1);
        g.fillStyle = '#1a1616';
        g.fillRect(amp.x + 2, amp.y + 2, amp.w - 4, amp.h - 4);
        const head = {x: amp.x + 1, y: amp.y - 9};
        g.fillStyle = '#0d0b0b';
        g.fillRect(head.x, head.y, amp.w - 2, 9);
        g.fillStyle = '#c4aa6c';
        g.fillRect(head.x + 2, head.y + 2, amp.w - 6, 4);
        g.fillStyle = '#1a1414';
        for (let k = 0; k < 7; k++) g.fillRect(head.x + 4 + k * 3, head.y + 3, 1, 2);
        g.fillStyle = '#3a3030';
        g.fillRect(head.x + 10, head.y - 1, 8, 1);
        const cones = [[amp.x + 8, amp.y + 11], [amp.x + 22, amp.y + 11]];

        // Cable from the amp curling to the guitar.
        const gx = cx + 24, gy = o.y1 - 17;
        g.fillStyle = '#0a0808';
        for (let k = 0; k <= 50; k++) {
            const f = k / 50;
            const x = amp.x + amp.w - 2 + (gx - 4 - (amp.x + amp.w - 2)) * f;
            const y = amp.y + 8 + (o.y1 - 3 - amp.y - 8) * Math.min(1, f * 3) - Math.sin(f * Math.PI) * 2 + Math.sin(f * 9) * 1.5 * f;
            g.fillRect(Math.round(x), Math.round(Math.min(y, o.y1 - 2)), 1, 1);
        }

        // Guitar on an A-frame stand, leaning back a touch.
        g.fillStyle = '#111';
        line(g, gx - 5, o.y1 - 3, gx, gy - 4);
        line(g, gx + 5, o.y1 - 3, gx, gy - 4);
        const burst = ['#f0b04a', '#d07a2a', '#9a3418', '#4a120c'].map(hex);
        const body = (bx: number, by: number, r: number) => {
            for (let y = -r; y <= r; y++)
                for (let x = -r; x <= r; x++) {
                    if (x * x + y * y > r * r + r * 0.6) continue;
                    const d = Math.hypot(x + bx - gx, (y + by - gy + 4) * 1.1) / 9;
                    g.fillStyle = css(ditherPick(burst, d, bx + x, by + y));
                    g.fillRect(bx + x, by + y, 1, 1);
                }
        };
        body(gx, gy, 7);
        body(gx - 1, gy - 10, 5);
        body(gx, gy - 5, 4);
        g.fillStyle = '#e8e0d0';
        g.fillRect(gx + 2, gy + 1, 3, 3);
        g.fillStyle = '#111';
        g.fillRect(gx - 3, gy - 5, 4, 1);
        g.fillRect(gx - 3, gy - 1, 4, 1);
        g.fillStyle = '#2a2a2a';
        g.fillRect(gx - 2, gy + 3, 4, 1);
        g.fillStyle = '#6b4426';
        for (let k = 0; k < 30; k++) {
            const y = gy - 13 - k, x = gx - 2 - Math.round(k * 0.16);
            g.fillRect(x, y, 2, 1);
        }
        g.fillStyle = '#2a1a10';
        g.fillRect(gx - 8, gy - 49, 3, 7);
        g.fillStyle = '#c8c8c8';
        for (let k = 0; k < 3; k++) {
            g.fillRect(gx - 9, gy - 48 + k * 2, 1, 1);
            g.fillRect(gx - 5, gy - 48 + k * 2, 1, 1);
        }
        g.fillStyle = 'rgba(230,225,210,0.3)';
        line(g, gx, gy + 3, gx - 6, gy - 42);

        // A stool in front of the amp.
        g.fillStyle = '#141010';
        g.fillRect(cx - 6, o.y1 - 15, 10, 2);
        line(g, cx - 5, o.y1 - 13, cx - 7, o.y1 - 2);
        line(g, cx + 3, o.y1 - 13, cx + 5, o.y1 - 2);
        line(g, cx - 1, o.y1 - 13, cx - 1, o.y1 - 4);

        // Outside: night sky, the house front around the opening, the lawn.
        const sky = ['#05060d', '#0a0d1c', '#111830', '#1a2240'].map(hex);
        const siding = ['#10131e', '#161a28', '#1c2030'].map(hex);
        const roofHalf = Math.min(Math.round(W * 0.46), half + 70);
        const outside = pixels(W, H, put => {
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) {
                    if (x >= o.x0 && x < o.x1 && y >= o.y0 && y < o.y1) continue;
                    const gable = roofY - (roofHalf - Math.abs(x - cx)) * 0.42;
                    const inHouse = Math.abs(x - cx) <= roofHalf && y >= gable && y < o.y1;
                    if (y >= o.y1) {
                        const f = (y - o.y1) / (H - o.y1);
                        const dl = o.x0 - f * W * 0.25, dr = o.x1 + f * W * 0.25;
                        if (x >= Math.floor(dl) && x < dr) continue;
                        put(x, y, ditherPick([hex('#05070a'), hex('#0a110e'), hex('#101a14')], 0.2 + f * 0.5, x, y));
                    } else if (inHouse) {
                        const edge = y - gable < 2;
                        put(x, y, edge ? hex('#06070c') : (y % 4 === 0 ? siding[0] : ditherPick(siding, 0.4 + 0.3 * (y / o.y1), x, y)));
                    } else {
                        put(x, y, ditherPick(sky, y / o.y1, x, y));
                    }
                }
            for (let i = 0; i < 60; i++) {
                const x = random() * W, y = random() * 50;
                if (y < roofY - (roofHalf - Math.abs(x - cx)) * 0.42) put(x, y, hex('#c8d0ff'), 70 + random() * 150);
            }
            // Pine silhouettes at the edges of the yard.
            const pine = hex('#04060a');
            for (const [tx, th] of [[cx - roofHalf - 18, 90], [cx - roofHalf - 34, 70], [cx + roofHalf + 20, 100], [cx + roofHalf + 40, 74]]) {
                const top = o.y1 - th;
                for (let y = top; y < o.y1 + 4; y++) {
                    const f = (y - top) / th;
                    const w = Math.round(f * 13 * (0.75 + 0.25 * Math.sin(y * 1.3)));
                    for (let x = -w; x <= w; x++) put(tx + x, y, pine);
                }
            }
        });
        const og = outside.ctx;
        // Rolled-up door panels, garage trim and a vent in the gable.
        og.fillStyle = '#4a4640';
        og.fillRect(o.x0, o.y0, o.x1 - o.x0, 7);
        og.fillStyle = '#2a2824';
        og.fillRect(o.x0, o.y0 + 3, o.x1 - o.x0, 1);
        og.fillRect(o.x0, o.y0 + 6, o.x1 - o.x0, 1);
        og.fillStyle = '#d8d2c4';
        og.fillRect(o.x0 - 3, o.y0 - 3, o.x1 - o.x0 + 6, 3);
        og.fillRect(o.x0 - 3, o.y0, 3, o.y1 - o.y0);
        og.fillRect(o.x1, o.y0, 3, o.y1 - o.y0);
        og.fillStyle = '#8a8478';
        og.fillRect(o.x0 - 1, o.y0, 1, o.y1 - o.y0);
        og.fillRect(o.x1, o.y0, 1, o.y1 - o.y0);
        og.fillStyle = '#06070c';
        ellipse(og, cx, roofY - 14, 4, 4);
        og.fillStyle = '#1c2030';
        for (let k = -3; k <= 3; k += 2) og.fillRect(cx - 3, roofY - 14 + k, 7, 1);

        const pivot = {x: cx, y: o.y0 + 7};
        const cord = 22;
        const moths = Array.from({length: 6}, () => ({
            r: 4 + random() * 9, w: 1.5 + random() * 2.5, p: random() * 6, s: random() < 0.5 ? -1 : 1
        }));
        const warm = hex('#ffcf80');
        const coneColours: RGB[] = ['#262424', '#333030', '#3e3a38'].map(hex);

        return (ctx, t, beat) => {
            const k = pulse(beat);
            const a = Math.sin(t * 1.3) * 0.28 + Math.sin(t * 0.47) * 0.06;
            const bx = pivot.x + Math.sin(a) * cord, by = pivot.y + Math.cos(a) * cord;
            const flick = 0.92 + 0.08 * Math.sin(t * 37) * Math.sin(t * 13) + 0.06 * k;

            ctx.drawImage(lit.canvas, 0, 0);

            // Speaker cones pump: the surround shrinks as the cone pushes out.
            for (const [sx, sy] of cones) {
                const push = Math.round(k * 2);
                ctx.fillStyle = '#060505';
                ellipse(ctx, sx, sy, 6, 6);
                ctx.fillStyle = css(coneColours[0]);
                ellipse(ctx, sx, sy, 5 - (push > 1 ? 1 : 0), 5 - (push > 1 ? 1 : 0));
                ctx.fillStyle = css(coneColours[1]);
                ellipse(ctx, sx, sy, 3 + push, 3 + push);
                ctx.fillStyle = css(coneColours[2]);
                ellipse(ctx, sx - (push ? 0 : 1), sy - 1, 1 + (push ? 1 : 0), 1 + (push ? 1 : 0));
            }
            ctx.fillStyle = css(hex('#ff3a20'), 0.6 + 0.4 * k);
            ctx.fillRect(head.x + amp.w - 5, head.y + 2, 1, 1);

            // Darkness falls off away from the bulb, so the light swings with it.
            const shade = ctx.createRadialGradient(bx, by, 3, bx, by, W * 0.55);
            shade.addColorStop(0, 'rgba(4,3,8,0)');
            shade.addColorStop(0.25, `rgba(4,3,8,${(0.25 / flick).toFixed(3)})`);
            shade.addColorStop(0.6, 'rgba(4,3,8,0.7)');
            shade.addColorStop(1, 'rgba(4,3,8,0.92)');
            ctx.fillStyle = shade;
            ctx.fillRect(0, 0, W, H);

            ctx.drawImage(outside.canvas, 0, 0);

            // Cord and bulb.
            ctx.fillStyle = '#0a0808';
            line(ctx, pivot.x, pivot.y, Math.round(bx), Math.round(by) - 2);
            ctx.globalCompositeOperation = 'lighter';
            const glow = ctx.createRadialGradient(bx, by, 1, bx, by, 40);
            glow.addColorStop(0, css(warm, 0.35 * flick));
            glow.addColorStop(1, css(warm, 0));
            ctx.fillStyle = glow;
            ctx.fillRect(bx - 40, by - 40, 80, 80);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#4a4440';
            ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 2, 2, 1);
            ctx.fillStyle = '#fff6d8';
            ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 3, 3);
            ctx.fillRect(Math.round(bx), Math.round(by) + 2, 1, 1);

            // Moths loop around the bulb, wings flickering.
            for (const m of moths) {
                const mx = bx + Math.cos(t * m.w * m.s + m.p) * m.r + Math.sin(t * 7 + m.p) * 1.5;
                const my = by + Math.sin(t * m.w * 1.3 + m.p) * m.r * 0.7;
                ctx.fillStyle = 'rgba(235,222,190,0.85)';
                ctx.fillRect(Math.round(mx), Math.round(my), 1, 1);
                if (Math.floor(t * 18 + m.p * 3) % 2) {
                    ctx.fillStyle = 'rgba(200,185,150,0.6)';
                    ctx.fillRect(Math.round(mx) - 1, Math.round(my), 3, 1);
                }
            }
        };
    }
};
