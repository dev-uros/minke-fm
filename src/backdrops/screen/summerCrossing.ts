import {Backdrop, canvas, css, ditherPick, hex, pixels, pulse, RGB, rng} from '../pixel';

/**
 * A summer afternoon out of an anime: towering cumulus over the fields,
 * power lines sagging between poles, and a level crossing whose lights
 * start clanging before a little commuter train rolls through.
 */
export const SUMMER_CROSSING: Backdrop = {
    id: 'screen-summer-crossing',
    name: 'Summer crossing',
    bpm: 96,
    create(W, H) {
        const random = rng(88);
        const horizon = 122;
        const rail = 138;
        const L = W * 2;
        const sun = {x: Math.round(W * 0.16), y: 92};
        const sky = ['#2456a0', '#3a78c0', '#6aa4d8', '#a8c8e0', '#f0d8b0', '#ffc27a'].map(hex);

        const back = pixels(W, H, put => {
            for (let y = 0; y < horizon + 4; y++)
                for (let x = 0; x < W; x++) {
                    const glow = Math.max(0, 1 - Math.hypot(x - sun.x, (y - sun.y) * 1.4) / (W * 0.5)) * 0.25;
                    put(x, y, ditherPick(sky, Math.pow(y / horizon, 1.4) + glow, x, y));
                }
            for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++)
                if (x * x + y * y <= 40) put(sun.x + x, sun.y + y, x * x + y * y < 20 ? hex('#ffffff') : hex('#fff2c8'));
        });

        // Cumulus: stacks of spheres shaded by a low sun from the left.
        type Ball = {x: number; y: number; r: number};
        const balls: Ball[] = [];
        const cumulus = (cx: number, base: number, width: number, height: number) => {
            for (let i = 0; i < width / 9; i++)
                balls.push({x: cx - width / 2 + i * 9 + random() * 4, y: base - 6, r: 7 + random() * 5});
            for (let lvl = 1; lvl < height / 12; lvl++) {
                const f = lvl / (height / 12);
                const w = width * (1 - f * 0.7) * (0.8 + random() * 0.3);
                const n = Math.max(1, Math.round(w / 16));
                for (let i = 0; i < n; i++)
                    balls.push({
                        x: cx + (random() - 0.5) * 10 + (i - (n - 1) / 2) * 14 + f * 8,
                        y: base - 6 - lvl * 12 + random() * 4,
                        r: 10 + random() * 8 * (1 - f * 0.4)
                    });
            }
        };
        cumulus(L * 0.28, 112, 120, 92);
        cumulus(L * 0.78, 114, 150, 104);
        cumulus(L * 0.55, 100, 44, 24);
        cumulus(L * 0.03, 104, 40, 20);
        const light = (() => { const v = [-0.75, -0.35, 0.55]; const m = Math.hypot(...v); return v.map(c => c / m); })();
        const cloudCols = ['#7a82b8', '#a6a6cc', '#d8c8d8', '#fbe2cc', '#fff6ea', '#ffffff'].map(hex);
        const clouds = pixels(L, H, put => {
            const zbuf = new Float32Array(L * H).fill(-1);
            const shade = new Float32Array(L * H);
            for (const b of balls) {
                const r = Math.ceil(b.r);
                for (let dy = -r; dy <= r; dy++)
                    for (let dx = -r; dx <= r; dx++) {
                        const d2 = dx * dx + dy * dy;
                        if (d2 > b.r * b.r) continue;
                        const x = ((Math.round(b.x) + dx) % L + L) % L, y = Math.round(b.y) + dy;
                        if (y < 0 || y >= H || y > 116) continue;
                        const z = Math.sqrt(b.r * b.r - d2);
                        const i = y * L + x;
                        // Further-forward spheres (lower ones) win.
                        const depth = z + b.y * 0.3;
                        if (depth <= zbuf[i]) continue;
                        zbuf[i] = depth;
                        const lam = (dx * light[0] + dy * light[1] + z * light[2]) / b.r;
                        shade[i] = 0.5 + 0.5 * lam - Math.max(0, (y - 96) / 40);
                    }
            }
            for (let y = 0; y < H; y++)
                for (let x = 0; x < L; x++) {
                    const i = y * L + x;
                    if (zbuf[i] < 0) continue;
                    put(x, y, ditherPick(cloudCols, shade[i] * 1.1, x, y));
                }
        });

        // Land: far tree line, fields, the track on its bank, the road.
        const roadX = Math.round(W * 0.64);
        const land = pixels(W, H, put => {
            for (let x = 0; x < W; x++) {
                const top = horizon - 3 - Math.round(Math.abs(Math.sin(x * 0.13)) * 3 + Math.abs(Math.sin(x * 0.041)) * 5);
                for (let y = top; y < horizon + 2; y++) put(x, y, ditherPick(['#3a5a78', '#4a6a80'].map(hex), (y - top) / 8, x, y));
            }
            const field = ['#2a4a2a', '#3a6a32', '#5a8a3a', '#8aa848', '#c8b860'].map(hex);
            for (let y = horizon + 2; y < H; y++)
                for (let x = 0; x < W; x++) {
                    const sunny = 1 - (y - horizon) / (H - horizon);
                    const rows = (y > rail + 6 && (x + Math.round((y - rail) * (x - roadX) / 60)) % 7 === 0) ? -0.12 : 0;
                    put(x, y, ditherPick(field, sunny * 0.9 + rows + 0.1, x, y));
                }
            // Road from the bottom to the horizon.
            for (let y = horizon + 2; y < H; y++) {
                const f = (y - horizon) / (H - horizon);
                const half = 2 + f * 18;
                for (let x = Math.floor(roadX - half); x <= roadX + half; x++)
                    put(x, y, Math.abs(x - roadX) < 0.6 && y % 6 < 3 && y > rail ? hex('#e8e0c0') : ditherPick(['#4a4a5a', '#6a6870', '#8a8078'].map(hex), 1 - f * 0.8, x, y));
            }
            // Embankment, ballast, sleepers, rails.
            for (let y = rail - 1; y < rail + 6; y++)
                for (let x = 0; x < W; x++) {
                    const onRoad = Math.abs(x - roadX) < 2 + ((y - horizon) / (H - horizon)) * 18;
                    if (y < rail + 2) put(x, y, x % 4 === 0 && !onRoad ? hex('#4a3a2a') : onRoad ? hex('#6a6870') : hex('#7a7068'));
                    else put(x, y, ditherPick(['#4a4038', '#6a6058'].map(hex), (rail + 6 - y) / 5, x, y));
                }
            for (let x = 0; x < W; x++) {
                put(x, rail - 1, hex('#c8c8d0'));
                put(x, rail + 1, hex('#8a8a96'));
            }
        });

        // Two poles and four wires sagging between them.
        const poles = [{x: Math.round(W * 0.09), top: 6, s: 1}, {x: Math.round(W * 0.93), top: 44, s: 0.6}];
        const front = canvas(W, H);
        {
            const c = front.ctx;
            for (const p of poles) {
                const w = Math.max(2, Math.round(4 * p.s));
                c.fillStyle = '#2a2026';
                c.fillRect(p.x, p.top, w, H - p.top);
                c.fillStyle = '#6a4a3a';
                c.fillRect(p.x, p.top, 1, H - p.top);
                for (const k of [0, 1]) {
                    const ay = p.top + Math.round((6 + k * 9) * p.s);
                    const half = Math.round(16 * p.s);
                    c.fillStyle = '#2a2026';
                    c.fillRect(p.x - half, ay, half * 2 + w, 2);
                    c.fillStyle = '#d8d8e0';
                    for (const ix of [-half + 1, -half / 2, half / 2 + w, half + w - 2]) c.fillRect(Math.round(p.x + ix), ay - 2, 1, 2);
                }
                if (p.s === 1) {
                    c.fillStyle = '#5a5e6a';
                    c.fillRect(p.x + 5, p.top + 30, 7, 12);
                    c.fillStyle = '#8a8e9a';
                    c.fillRect(p.x + 5, p.top + 30, 2, 12);
                    c.fillStyle = '#3a3e4a';
                    c.fillRect(p.x + 5, p.top + 30, 7, 1);
                }
            }
            c.fillStyle = '#1a1820';
            const ends = (p: typeof poles[number]) => {
                const half = Math.round(16 * p.s);
                const out: Array<[number, number]> = [];
                for (const k of [0, 1]) {
                    const ay = p.top + Math.round((6 + k * 9) * p.s) - 2;
                    out.push([p.x - half + 1, ay], [p.x + half + 2, ay]);
                }
                return out;
            };
            const a = ends(poles[0]), b = ends(poles[1]);
            a.forEach(([x0, y0], i) => {
                const [x1, y1] = b[i];
                let prev = y0;
                for (let x = x0; x <= x1; x++) {
                    const f = (x - x0) / (x1 - x0);
                    const y = Math.round(y0 + (y1 - y0) * f + Math.sin(f * Math.PI) * [16, 10, 22, 15][i]);
                    c.fillRect(x, Math.min(y, prev + 1), 1, Math.max(1, Math.abs(y - prev)));
                    prev = y;
                }
            });
        }
        // Where the second wire is at a given x (birds sit on it).
        const wireY = (x: number) => {
            const p0 = poles[0], p1 = poles[1];
            const x0 = p0.x - 16 + 1, y0 = p0.top + 6 - 2;
            const x1 = p1.x - Math.round(16 * p1.s) + 1, y1 = p1.top + Math.round(6 * p1.s) - 2;
            const f = (x - x0) / (x1 - x0);
            return Math.round(y0 + (y1 - y0) * f + Math.sin(f * Math.PI) * 16);
        };
        const birds = [0.38, 0.42, 0.55].map((f, i) => ({x: Math.round(W * f), i}));

        // The commuter train, painted once.
        const carW = 62, cars = 3, trainW = cars * (carW + 2);
        const trainImg = pixels(trainW, 24, put => {
            for (let c = 0; c < cars; c++) {
                const x0 = c * (carW + 2);
                for (let y = 0; y < 21; y++)
                    for (let x = 0; x < carW; x++) {
                        const nose = c === cars - 1 ? Math.max(0, 6 - y) - (carW - 1 - x) : -1;
                        const tail = c === 0 ? Math.max(0, 6 - y) - x : -1;
                        if (nose > 0 || tail > 0 || (y === 0 && (x < 2 || x > carW - 3))) continue;
                        let col: RGB = hex('#ece4d4');
                        if (y === 0) col = hex('#b8b0a8');
                        else if (y >= 5 && y < 11) col = (x % 9 === 0) ? hex('#d8d0c0') : ditherPick(['#4a6a90', '#8ab0d0', '#d8e8f0'].map(hex), (x % 9) / 12 + (y - 5) / 20, x0 + x, y);
                        else if (y >= 13 && y < 15) col = hex('#2e8a5a');
                        else if (y === 15) col = hex('#e8a040');
                        else if (y >= 19) col = hex('#3a3a44');
                        if ((x === 20 || x === 21 || x === 42 || x === 43) && y > 3 && y < 19) col = hex('#8a8478');
                        put(x0 + x, y, col);
                    }
                for (const tx of [10, carW - 10]) for (const wo of [-3, 3]) {
                    put(x0 + tx + wo, 21, hex('#1a1a20'));
                    put(x0 + tx + wo - 1, 22, hex('#1a1a20'));
                    put(x0 + tx + wo + 1, 22, hex('#1a1a20'));
                    put(x0 + tx + wo, 22, hex('#1a1a20'));
                }
            }
            put(trainW - 3, 14, hex('#ffffff'));
            put(trainW - 4, 14, hex('#ffffff'));
            put(1, 14, hex('#ff3030'));
        });

        // Crossing signal on the near side of the road.
        const sig = {x: roadX - 24, base: 150, top: 98};
        const cycle = 26, trainSpeed = 110;
        const gateAngle = (p: number) => {
            const down = p < 1 ? 0 : p < 2.2 ? (p - 1) / 1.2 : p < 11 ? 1 : p < 12.2 ? 1 - (p - 11) / 1.2 : 0;
            return -Math.PI / 2 * 0.92 * (1 - down);
        };
        const blades = Array.from({length: Math.round(W / 2)}, () => ({x: Math.floor(random() * W), h: 3 + Math.floor(random() * 7), p: random() * 6}));
        const dragonflies = [0, 1].map(i => ({x: W * (0.3 + i * 0.4), y: 150 + i * 8, p: i * 3}));

        return (ctx, t, beat) => {
            const kick = pulse(beat);
            const p = t % cycle;
            const active = p < 12.4;

            ctx.drawImage(back.canvas, 0, 0);
            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(sun.x, sun.y, 2, sun.x, sun.y, 50 + kick * 4);
            g.addColorStop(0, `rgba(255,230,170,${(0.35 + 0.1 * kick).toFixed(3)})`);
            g.addColorStop(1, 'rgba(255,230,170,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = 'source-over';

            const drift = Math.floor((t * 1.5) % L);
            ctx.drawImage(clouds.canvas, -drift, 0);
            ctx.drawImage(clouds.canvas, L - drift, 0);
            ctx.drawImage(land.canvas, 0, 0);

            // Train.
            const tx = Math.round(-trainW - 10 + (p - 4) * trainSpeed);
            if (tx > -trainW && tx < W) ctx.drawImage(trainImg.canvas, tx, rail - 23);

            // Signal: striped post, crossbuck, two lamps, and the gate arm.
            const sx = sig.x;
            for (let y = sig.top; y < sig.base; y++) {
                ctx.fillStyle = y > sig.base - 22 ? (Math.floor(y / 3) % 2 ? '#f0c020' : '#1a1a1a') : '#d8d8d8';
                ctx.fillRect(sx, y, 2, 1);
            }
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(sx - 3, sig.base, 8, 2);
            for (let k = -6; k <= 6; k++) {
                const col = Math.floor((k + 6) / 3) % 2 ? '#1a1a1a' : '#f0c020';
                ctx.fillStyle = col;
                ctx.fillRect(sx + k, sig.top + 4 + Math.round(k * 0.6), 2, 1);
                ctx.fillRect(sx + k, sig.top + 4 - Math.round(k * 0.6), 2, 1);
            }
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(sx - 7, sig.top + 13, 16, 1);
            const left = active && Math.floor(beat) % 2 === 0, right = active && !left;
            for (const [lx, on] of [[sx - 6, left], [sx + 5, right]] as Array<[number, boolean]>) {
                ctx.fillStyle = '#111';
                ctx.fillRect(lx - 1, sig.top + 14, 5, 5);
                ctx.fillStyle = on ? '#ff3a2a' : '#5a1a18';
                ctx.fillRect(lx, sig.top + 15, 3, 3);
                if (on) {
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.fillStyle = 'rgba(255,80,50,0.25)';
                    ctx.fillRect(lx - 3, sig.top + 12, 9, 9);
                    ctx.globalCompositeOperation = 'source-over';
                }
            }
            const ang = gateAngle(p);
            const pivot = {x: sx + 3, y: sig.base - 12};
            for (let r = 0; r < 34; r++) {
                ctx.fillStyle = Math.floor(r / 4) % 2 ? '#1a1a1a' : '#f0c020';
                ctx.fillRect(Math.round(pivot.x + Math.cos(ang) * r), Math.round(pivot.y + Math.sin(ang) * r), 2, 2);
            }
            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(pivot.x - 1, pivot.y - 1, 3, 3);

            ctx.drawImage(front.canvas, 0, 0);

            // Birds on the wire; one takes off now and then and comes back.
            ctx.fillStyle = '#1a1820';
            for (const b of birds) {
                const away = (t + b.i * 7) % 21;
                let x = b.x, y = wireY(b.x) - 2;
                if (away < 5) {
                    const f = away / 5;
                    x = Math.round(b.x + Math.sin(f * Math.PI) * 50 * (b.i % 2 ? 1 : -1));
                    y = Math.round(y - Math.sin(f * Math.PI) * 30);
                    const flap = Math.floor(t * 10) % 2;
                    ctx.fillRect(x, y, 1, 1);
                    ctx.fillRect(x - 2, y - flap, 2, 1);
                    ctx.fillRect(x + 1, y - flap, 2, 1);
                } else {
                    ctx.fillRect(x, y, 2, 2);
                    ctx.fillRect(x + 1, y - 1, 1, 1);
                }
            }

            // Grass in the foreground sways in the warm wind.
            for (const b of blades) {
                const sway = Math.sin(t * 1.6 + b.p + b.x * 0.05) * 0.25;
                ctx.fillStyle = b.p > 3 ? '#2a4a22' : '#3a6a2a';
                for (let k = 0; k < b.h; k++) ctx.fillRect(Math.round(b.x + sway * k), H - 1 - k, 1, 1);
                ctx.fillStyle = css([255, 220, 140], 0.6);
                ctx.fillRect(Math.round(b.x + sway * b.h), H - b.h, 1, 1);
            }
            // Two red dragonflies hovering and darting.
            for (const d of dragonflies) {
                const dart = Math.floor((t + d.p) / 2.5);
                const x = Math.round(d.x + Math.sin(dart * 2.3) * 30 + Math.sin(t * 2 + d.p) * 2);
                const y = Math.round(d.y + Math.cos(dart * 1.7) * 8 + Math.sin(t * 3 + d.p));
                ctx.fillStyle = '#d8382a';
                ctx.fillRect(x, y, 4, 1);
                ctx.fillStyle = `rgba(255,255,255,${Math.floor(t * 20) % 2 ? 0.7 : 0.35})`;
                ctx.fillRect(x + 1, y - 1, 1, 1);
                ctx.fillRect(x + 2, y - 1, 1, 1);
            }
        };
    }
};
