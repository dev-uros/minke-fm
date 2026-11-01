import {Backdrop, canvas, css, ditherPick, hash, hex, pixels, pulse, RGB, rng, wrappingNoise} from '../pixel';

/** Pixels around a circle, for a neon ring. */
function ring(cx: number, cy: number, r: number): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    const n = Math.round(r * 7);
    for (let i = 0; i < n; i++) {
        const p: [number, number] = [Math.round(cx + Math.cos((i / n) * Math.PI * 2) * r), Math.round(cy + Math.sin((i / n) * Math.PI * 2) * r)];
        if (!out.some(q => q[0] === p[0] && q[1] === p[1])) out.push(p);
    }
    return out;
}

/**
 * A smoky bar after midnight, from a stool at the counter: a glass of whiskey
 * on the rocks, bottles glowing on the back bar, a round neon beer-mug sign
 * buzzing over them and a slow ceiling fan stirring the haze.
 */
export const BAR_COUNTER: Backdrop = {
    id: 'blues-bar-counter',
    name: 'Last call',
    bpm: 96,
    create(W, H) {
        const random = rng(29);
        const cx = Math.round(W / 2);
        const counterY = 118, front = 138;
        const mirror = {x0: cx - Math.round(W * 0.3), x1: cx + Math.round(W * 0.3), y0: 46, y1: 106};
        const shelves = [76, 104];
        const fan = {x: cx + Math.round(W * 0.3), y: 11};
        const sign = {x: cx, y: 27, r: 14};
        const glass = {x: cx + 22, y: 135};

        const panel = ['#050304', '#0c0607', '#160b0a', '#22120e', '#331b13', '#4a2818'].map(hex);
        const mirrorPal = ['#06070a', '#0c0f16', '#151a24', '#202838'].map(hex);
        const counterPal = ['#080404', '#140907', '#24120a', '#3a1d0f', '#5a2e16', '#844822', '#b8703a'].map(hex);
        const bottleKinds = [
            ['#2a1004', '#6a2e0a', '#b0601a', '#e89a40'],
            ['#06180c', '#0e3a1c', '#1e6a34', '#4aa060'],
            ['#141414', '#3a3a3a', '#7a7a78', '#c8c8c0'],
            ['#200606', '#541410', '#90281c', '#d05a3a'],
            ['#1a1204', '#4a3610', '#8a6a24', '#d0b060']
        ].map(k => k.map(hex));

        const back = pixels(W, H, put => {
            // Ceiling and wood-panelled wall.
            for (let y = 0; y < counterY; y++) {
                for (let x = 0; x < W; x++) {
                    let v: number;
                    if (y < 8) v = 0.08 + (y === 7 ? 0.15 : 0);
                    else {
                        const board = x % 11 === 0 ? -0.08 : (hash(Math.floor(x / 11), 3) - 0.5) * 0.08;
                        v = 0.2 + board + Math.max(0, 1 - Math.hypot(x - cx, (y - 70) * 1.4) / (W * 0.6)) * 0.35;
                    }
                    put(x, y, ditherPick(panel, v, x, y));
                }
            }
            // Back-bar mirror with a frame.
            for (let y = mirror.y0; y < mirror.y1; y++)
                for (let x = mirror.x0; x < mirror.x1; x++) {
                    const streak = (x - y * 0.6 + 400) % 60 < 6 ? 0.2 : 0;
                    const above = y < shelves[0] ? mirror.y0 : shelves[0] + 2;
                    const strip = Math.exp(-(y - above) / 8) * 0.5;
                    put(x, y, ditherPick(mirrorPal, 0.3 + streak + strip - Math.abs(x - cx) / (W * 0.6), x, y));
                }
            for (let x = mirror.x0 - 3; x < mirror.x1 + 3; x++)
                for (const y of [mirror.y0 - 3, mirror.y0 - 2, mirror.y0 - 1]) put(x, y, ditherPick(panel, y === mirror.y0 - 3 ? 0.9 : 0.5, x, y));
            for (let y = mirror.y0; y < mirror.y1; y++)
                for (const x of [mirror.x0 - 3, mirror.x0 - 2, mirror.x0 - 1, mirror.x1, mirror.x1 + 1, mirror.x1 + 2])
                    put(x, y, ditherPick(panel, 0.5, x, y));
            // Shelves full of bottles.
            for (const sy of shelves) {
                let x = mirror.x0 + 2;
                while (x < mirror.x1 - 6) {
                    const w = 4 + Math.floor(random() * 3), body = 8 + Math.floor(random() * 9), neck = 3 + Math.floor(random() * 4);
                    const pal = bottleKinds[Math.floor(random() * bottleKinds.length)];
                    const level = sy - Math.floor(body * (0.3 + random() * 0.6));
                    for (let y = sy - body - neck - 1; y < sy; y++) {
                        const inNeck = y < sy - body;
                        const shoulder = y === sy - body || y === sy - body + 1;
                        for (let bx = 0; bx < w; bx++) {
                            const px = x + bx;
                            if (inNeck && (bx < Math.floor(w / 2) - 1 || bx > Math.floor(w / 2))) continue;
                            if (shoulder && y === sy - body && (bx === 0 || bx === w - 1)) continue;
                            let v = y > level ? 0.55 : 0.25;
                            if (bx === 1) v += 0.35;
                            if (bx === w - 1) v -= 0.2;
                            if (y === sy - body - neck - 1) v = 0.1;
                            if (!inNeck && y > sy - body * 0.7 && y < sy - body * 0.3 && bx > 0 && bx < w - 1) v = 0.9;
                            put(px, y, ditherPick(pal, v, px, y));
                        }
                    }
                    x += w + (random() < 0.3 ? 2 : 1);
                }
                for (let x2 = mirror.x0 - 2; x2 < mirror.x1 + 2; x2++) {
                    put(x2, sy, ditherPick(panel, 0.95, x2, sy));
                    put(x2, sy + 1, ditherPick(panel, 0.4, x2, sy + 1));
                    put(x2, sy + 2, panel[0]);
                }
            }
            // The counter: a varnished top, panelled front and a brass foot rail.
            for (let y = counterY; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    let v: number;
                    if (y < front) {
                        const d = (y - counterY) / (front - counterY);
                        v = 0.3 + Math.sin((x - cx) * (0.05 / (0.4 + d)) + Math.sin(x * 0.013) * 3) * 0.07 + d * 0.25;
                        if (y === counterY) v = 0.92;
                        if (y === front - 1) v = 0.8;
                    } else {
                        v = 0.18 - (y - front) / 250 + (x % 28 === 0 ? -0.12 : x % 28 === 1 ? 0.1 : 0);
                        if (y === front) v = 0.02;
                    }
                    put(x, y, ditherPick(counterPal, v, x, y));
                }
            }
            const brass = ['#3a2408', '#7a5214', '#c89a34', '#ffe08a'].map(hex);
            for (let x = 0; x < W; x++) {
                put(x, 164, brass[3]);
                put(x, 165, brass[2]);
                put(x, 166, brass[1]);
                put(x, 167, brass[0]);
                if (x % 40 === 12) for (let y = 160; y < 168; y++) put(x, y, brass[y < 162 ? 1 : 2]);
            }
            // A bottle further back on the counter.
            const b0 = glass.x + 14, by = glass.y - 4;
            for (let y = by - 46; y < by; y++) {
                const neck = y < by - 30;
                const shoulder = y < by - 27 && !neck;
                for (let x = b0; x < b0 + 13; x++) {
                    if (neck && (x < b0 + 5 || x > b0 + 7)) continue;
                    if (shoulder && (x < b0 + (by - 27 - y) * 1.5 || x > b0 + 12 - (by - 27 - y) * 1.5)) continue;
                    let v = 0.3 + (x === b0 + 2 || x === b0 + 3 ? 0.4 : 0) - (x >= b0 + 11 ? 0.15 : 0);
                    if (!neck && !shoulder && y > by - 22 && y < by - 8) v = x === b0 || x === b0 + 12 ? 0.3 : (y === by - 21 || y === by - 9) ? 0.5 : 0.92;
                    if (y < by - 42) v = 0.05;
                    put(x, y, ditherPick(bottleKinds[0], v, x, y));
                }
            }
            // Whiskey on the rocks: a heavy tumbler, glass you can see through.
            const whiskey = ['#3a1404', '#7a3008', '#c06418', '#f0a040', '#ffd080'].map(hex);
            const gw = 21, gh = 22, g0 = glass.x - 10, gy = glass.y, level = gy - 12;
            for (let y = gy - gh; y < gy; y++) {
                for (let x = g0; x < g0 + gw; x++) {
                    const side = x === g0 || x === g0 + gw - 1;
                    const base = y >= gy - 4;
                    if (y === level && !side) put(x, y, whiskey[4]);
                    else if (y > level && !side && !base) put(x, y, ditherPick(whiskey, 0.3 + (x - g0) / (gw * 2) + (gy - y) / 40, x, y));
                    else if (side) put(x, y, hex('#dce6f0'), 130);
                    else if (base) put(x, y, ditherPick(whiskey, 0.15 + (y === gy - 4 ? 0.6 : 0), x, y), 200);
                    else put(x, y, hex('#a8b8c8'), 22);
                    if (x === g0 + 2 && y > gy - gh + 2 && y < gy - 5) put(x, y, hex('#ffffff'), 110);
                }
            }
            for (let x = g0; x < g0 + gw; x++) {
                put(x, gy - gh, hex('#eef4ff'), 220);
                put(x, gy - gh + 1, hex('#a8b8c8'), 60);
            }
            // Ice cubes, one tilted, poking above the whiskey.
            const cube = (ix: number, iy: number, s: number) => {
                for (let y = iy; y < iy + s; y++)
                    for (let x = ix; x < ix + s; x++) {
                        const edge = y === iy || x === ix;
                        put(x, y, hex(edge ? '#f6faff' : (x + y) % 3 === 0 ? '#d8e4f0' : '#a8bccc'), y > level ? 140 : 235);
                    }
            };
            cube(g0 + 3, level - 4, 7);
            cube(g0 + 10, level - 3, 6);
        });

        // Neon: a round sign with a frothy beer mug inside.
        const ringTube = ring(sign.x, sign.y, sign.r);
        const mug: Array<[number, number]> = [];
        for (let y = -5; y <= 6; y++) {
            mug.push([sign.x - 5, sign.y + y]);
            mug.push([sign.x + 4, sign.y + y]);
        }
        for (let x = -5; x <= 4; x++) mug.push([sign.x + x, sign.y + 6]);
        for (let y = -2; y <= 3; y++) mug.push([sign.x + 7, sign.y + y]);
        mug.push([sign.x + 5, sign.y - 3], [sign.x + 6, sign.y - 3], [sign.x + 5, sign.y + 4], [sign.x + 6, sign.y + 4]);
        const foam: Array<[number, number]> = [];
        for (let x = -6; x <= 5; x++) foam.push([sign.x + x, sign.y - 6 - Math.round(Math.abs(Math.sin(x * 0.9)) * 2)]);
        const red = hex('#ff3a3a'), amber = hex('#ffb030'), white = hex('#fff2d0');

        const hazeBig = wrappingNoise(W, H, 30, random), hazeSmall = wrappingNoise(W, H, 10, random);
        const haze = pixels(W, H, put => {
            const c = hex('#c8a890');
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) {
                    const v = hazeBig(x, y) * 0.7 + hazeSmall(x, y) * 0.3;
                    if (v > 0.35) put(x, y, c, Math.round((v - 0.35) * 380 * (1 - y / (H * 1.2))));
                }
        });
        const blade = ['#120908', '#2a1610', '#4a2a1a'].map(hex);
        const fanLight: RGB = hex('#ffcf8a');
        const scratch = canvas(W, H);

        const tube = (c: CanvasRenderingContext2D, pts: Array<[number, number]>, colour: RGB, on: number) => {
            c.fillStyle = css(colour, on);
            for (const [x, y] of pts) c.fillRect(x, y, 1, 1);
        };

        return (ctx, t, beat) => {
            const kick = pulse(beat);
            ctx.drawImage(back.canvas, 0, 0);

            // Neon glow and tubes; the ring stutters every so often.
            const stutter = (t % 9) < 0.5 && hash(Math.floor(t * 24), 5) < 0.5;
            const ringOn = stutter ? 0.12 : 0.9 + hash(Math.floor(t * 30), 4) * 0.1;
            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(sign.x, sign.y, 3, sign.x, sign.y, 44);
            g.addColorStop(0, css(red, (0.18 + 0.08 * kick) * (0.4 + 0.6 * ringOn)));
            g.addColorStop(0.5, css(amber, 0.06 + 0.03 * kick));
            g.addColorStop(1, css(amber, 0));
            ctx.fillStyle = g;
            ctx.fillRect(sign.x - 46, sign.y - 46, 92, 92);
            // Its smear on the counter top.
            ctx.fillStyle = css(red, 0.1 * ringOn);
            ctx.fillRect(sign.x - 10, counterY + 1, 20, 4);
            ctx.globalCompositeOperation = 'source-over';
            tube(ctx, ringTube, red, ringOn);
            tube(ctx, mug, amber, 0.95);
            tube(ctx, foam, white, 0.95);

            // The fan's light under the blades, and the blades going round.
            const spin = t * 2.2;
            ctx.globalCompositeOperation = 'lighter';
            const fg = ctx.createRadialGradient(fan.x, fan.y + 6, 1, fan.x, fan.y + 6, 60);
            fg.addColorStop(0, css(fanLight, 0.3 + 0.03 * Math.cos(spin * 4)));
            fg.addColorStop(1, css(fanLight, 0));
            ctx.fillStyle = fg;
            ctx.fillRect(fan.x - 60, fan.y - 54, 120, 120);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#120908';
            ctx.fillRect(fan.x, 0, 1, fan.y - 3);
            const blades = [0, 1, 2, 3].map(i => spin + (i * Math.PI) / 2).sort((a, b) => Math.sin(a) - Math.sin(b));
            for (const a of blades) {
                const len = 24;
                for (let k = 3; k <= len; k++) {
                    const x = Math.round(fan.x + Math.cos(a) * k);
                    const y = Math.round(fan.y + Math.sin(a) * k * 0.18);
                    const w = k > 6 ? 2 : 1;
                    ctx.fillStyle = css(blade[Math.sin(a) > 0 ? 2 : 1]);
                    ctx.fillRect(x, y - 1, 1, w);
                    ctx.fillStyle = css(blade[0]);
                    ctx.fillRect(x, y - 1 + w, 1, 1);
                }
            }
            ctx.fillStyle = '#2a1a12';
            ctx.fillRect(fan.x - 3, fan.y - 3, 7, 4);
            ctx.fillStyle = '#4a3020';
            ctx.fillRect(fan.x - 3, fan.y - 3, 7, 1);
            ctx.fillStyle = '#ffe6b0';
            ctx.fillRect(fan.x - 2, fan.y + 1, 5, 2);
            ctx.fillStyle = '#fff8e8';
            ctx.fillRect(fan.x - 1, fan.y + 2, 3, 1);

            // Smoke haze, stirred by the fan.
            const s = scratch.ctx;
            s.clearRect(0, 0, W, H);
            const drift = Math.floor(t * 3) % W;
            s.drawImage(haze.canvas, -drift, Math.round(Math.sin(t * 0.3) * 2));
            s.drawImage(haze.canvas, W - drift, Math.round(Math.sin(t * 0.3) * 2));
            ctx.globalAlpha = 0.13 + 0.03 * kick;
            ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(scratch.canvas, 0, 0);
            ctx.globalAlpha = 1;

            // The ice catches the light: a glint walks across the rim each bar.
            const bar = (beat / 4) % 1;
            const gx = Math.round(glass.x - 10 + bar * 20);
            ctx.fillStyle = `rgba(255,255,255,${(0.9 * (1 - bar)).toFixed(3)})`;
            ctx.fillRect(gx, glass.y - 22, 1, 1);
            ctx.fillStyle = `rgba(255,240,200,${(0.7 * kick).toFixed(3)})`;
            ctx.fillRect(glass.x - 7, glass.y - 16, 1, 1);
            ctx.fillRect(glass.x, glass.y - 15, 1, 1);
            ctx.fillRect(glass.x - 4, glass.y - 11, 3, 1);
            ctx.globalCompositeOperation = 'source-over';
        };
    }
};
