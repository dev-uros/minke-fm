import {Backdrop, bayer, canvas, disc, ditherPick, hex, pixels, pulse, RGB, rng} from '../pixel';

/**
 * A red barn and silo among rolling hills on a bright morning: puffy clouds
 * drift over, the weathervane swings with the breeze, and a pickup trundles
 * along a far dirt road kicking up a trail of dust. The sunlight swells
 * softly on the beat.
 */
export const BARN_MORNING: Backdrop = {
    id: 'country-barn-morning',
    name: 'Red barn morning',
    bpm: 100,
    create(W, H) {
        const random = rng(73);
        const horizon = Math.round(H * 0.5);
        const sky = ['#4f8fcf', '#73abdc', '#9cc6e6', '#c8dfe9', '#ecebd6', '#f8e6bb'].map(hex);
        const sun = {x: Math.round(W * 0.78), y: 24};

        const hill = (base: number, a: number, f: number, ph: number) =>
            (x: number) => Math.round(base - a * Math.sin(x * f + ph) - a * 0.4 * Math.sin(x * f * 2.3 + ph * 2));
        const far = hill(horizon + 2, 5, 0.022, 1);
        const mid = hill(horizon + 16, 7, 0.016, 3.6);
        const near = hill(horizon + 44, 6, 0.012, 0.4);
        const roadY = (x: number) => mid(x) + 7 + Math.round(Math.sin(x * 0.03) * 2);

        const back = pixels(W, H, put => {
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, y / horizon, x, y));
            for (let y = -20; y <= 20; y++)
                for (let x = -20; x <= 20; x++) {
                    const d = Math.hypot(x, y);
                    if (d < 18 && (1 - d / 18) * 0.8 > bayer(x, y)) put(sun.x + x, sun.y + y, hex('#fff6d8'), 120);
                }
            disc(put, sun.x, sun.y, 6, () => hex('#fffbea'));

            const farC = ['#9cbcb0', '#86ad9c'].map(hex);
            const midC = ['#b6cf6a', '#94bd56', '#78a64a'].map(hex);
            const nearC = ['#8fc456', '#6fa944', '#4f8a3a', '#3b7032'].map(hex);
            for (let x = 0; x < W; x++) {
                const f = far(x), m = mid(x), n = near(x);
                for (let y = f; y < m; y++) put(x, y, ditherPick(farC, (y - f) / 14, x, y));
                for (let y = m; y < n; y++) {
                    // Ploughed rows on the middle hill.
                    const row = (y - m) % 3 === 0 && y > roadY(x) + 2 && x > W * 0.55;
                    put(x, y, row ? hex('#6f9a44') : ditherPick(midC, (y - m) / 26, x, y));
                }
                for (let y = n; y < H; y++) put(x, y, ditherPick(nearC, (y - n) / (H - n), x, y));
                // Road along the middle hill.
                const r = roadY(x);
                put(x, r, hex('#e3d3a2'));
                put(x, r + 1, hex('#c8b483'));
            }
            // Far trees along the ridge line.
            for (let i = 0; i < 26; i++) {
                const x = Math.round(random() * W), y = far(x);
                disc(put, x, y - 1, 1 + Math.round(random() * 1.5), (px, py) => (px + py) % 3 ? hex('#5d8a74') : hex('#6f9c84'));
            }
        });

        // Barn, silo, oak and fence on the near hill.
        const bx = Math.round(W * 0.5 - 22), bw = 40;
        const groundAt = near(bx + bw / 2);
        const by = groundAt + 4;
        const wallTop = by - 22;
        const props = pixels(W, H, put => {
            const red: RGB[] = ['#c9443a', '#a8352f', '#862a28'].map(hex);
            const roof = hex('#4a2a2c'), roofLit = hex('#6e3c38'), trim = hex('#f3ead6');
            // Silo behind and right of the barn.
            const sx = bx + bw + 2, sw = 13, sTop = by - 46;
            for (let y = sTop; y < by; y++)
                for (let x = sx; x < sx + sw; x++) {
                    const f = (x - sx) / sw;
                    const band = (y - sTop) % 6 === 0;
                    put(x, y, band ? hex('#8d9aa6') : ditherPick(['#e6ecef', '#c3cdd5', '#97a5b2'].map(hex), Math.abs(f - 0.3) * 1.6, x, y));
                }
            for (let y = 0; y < 6; y++) {
                const hw = Math.round(Math.sqrt(1 - Math.pow((6 - y) / 6.5, 2)) * sw / 2);
                for (let x = -hw; x <= hw; x++) put(sx + Math.floor(sw / 2) + x, sTop - 6 + y, ditherPick(['#b9c3cc', '#7f8d9a'].map(hex), (x + hw) / (2 * hw + 1), x, y));
            }
            // Gambrel roof: steep lower slope, shallow upper.
            const cx = bx + bw / 2;
            for (let y = wallTop - 18; y < wallTop; y++) {
                const k = y - (wallTop - 18);
                const hw = k < 7 ? 6 + k * 1.6 : 17 + (k - 7) * 0.4;
                for (let x = Math.round(cx - hw - 1); x <= Math.round(cx + hw + 1); x++) {
                    const edge = Math.abs(x - cx) > hw - 1;
                    put(x, y, edge ? trim : (x < cx ? roofLit : roof));
                }
            }
            // Front wall with boards.
            for (let y = wallTop; y < by; y++)
                for (let x = bx; x < bx + bw; x++)
                    put(x, y, x % 3 === 0 ? red[2] : ditherPick(red, (x - bx) / bw * 0.7 + (y - wallTop) / 60, x, y));
            // Gable face above the wall.
            for (let y = wallTop - 16; y < wallTop; y++) {
                const k = y - (wallTop - 18);
                const hw = (k < 7 ? 6 + k * 1.6 : 17 + (k - 7) * 0.4) - 2;
                for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++)
                    put(x, y, x % 3 === 0 ? red[2] : red[1]);
            }
            // Big doors with white X braces, hayloft door, trim.
            const dw = 16, dx = Math.round(cx - dw / 2), dh = 15, dy = by - dh;
            for (let y = dy; y < by; y++)
                for (let x = dx; x < dx + dw; x++) {
                    const lx = x - dx, ly = y - dy;
                    const half = lx < dw / 2 ? lx : lx - dw / 2;
                    const onX = Math.abs(half - ly * (dw / 2) / dh) < 0.8 || Math.abs(half - (dh - ly) * (dw / 2) / dh) < 0.8;
                    const frame = lx === 0 || lx === dw - 1 || ly === 0 || lx === dw / 2;
                    put(x, y, frame || onX ? trim : red[2]);
                }
            for (let y = wallTop - 12; y < wallTop - 4; y++)
                for (let x = Math.round(cx - 3); x < Math.round(cx + 3); x++)
                    put(x, y, (y === wallTop - 12 || y === wallTop - 5 || x === Math.round(cx - 3) || x === Math.round(cx + 2)) ? trim : hex('#3a1c1c'));
            for (let x = bx; x < bx + bw; x++) put(x, wallTop, trim);
            for (let y = wallTop; y < by; y++) {
                put(bx, y, trim);
                put(bx + bw - 1, y, trim);
            }
            // An oak to the left.
            const ox = bx - 26, oy = near(ox) + 2;
            for (let y = oy - 14; y < oy; y++) {
                put(ox, y, hex('#4a3426'));
                put(ox + 1, y, hex('#5e4430'));
            }
            const leaf = ['#5fa548', '#3f8238', '#2c6230'].map(hex);
            for (const [ox2, oy2, r] of [[0, -20, 9], [-7, -15, 6], [7, -16, 7], [2, -27, 6]] as const)
                disc(put, ox + ox2, oy + oy2, r, (x, y) => ditherPick(leaf, (y - (oy - 34)) / 26 + (x - ox) / 40, x, y));
            // Fence in front, following the hill.
            for (let x = 0; x < W; x++) {
                const fy = Math.round(H * 0.86);
                const post = x % 14 === 0;
                if (post) for (let k = 0; k < 9; k++) put(x, fy - k, hex('#f2ece0'));
                put(x, fy - 7, hex('#e7e0d0'));
                put(x, fy - 3, hex('#d8d0be'));
            }
        });
        const vane = {x: Math.round(bx + bw / 2), y: wallTop - 18};

        // Clouds: puffs with flat, shaded bottoms, drifting right and wrapping.
        const clouds = Array.from({length: 4}, (_, i) => {
            const cw = 30 + Math.floor(random() * 26), ch = 14;
            const c = pixels(cw, ch, put => {
                const puffs = 4 + Math.floor(random() * 3);
                for (let p = 0; p < puffs; p++) {
                    const px = 5 + (p / (puffs - 1)) * (cw - 10), r = 3 + Math.round(random() * 3 + (p % 2) * 1.5);
                    disc(put, px, ch - r - 1, r, (x, y) => y > ch - 4 ? hex('#d3dde8') : (y + x) % 7 === 0 ? hex('#eef3f8') : hex('#ffffff'));
                }
            });
            return {c, x: random() * W, y: 6 + i * 10 + Math.round(random() * 6), speed: 1.2 + random() * 1.5};
        });

        const dust = Array.from({length: 22}, () => ({x: 0, y: 0, age: 99, life: 2 + random() * 2}));
        let nextPuff = 0;
        let last = 0;
        const truckPeriod = 34;
        const dustLayer = canvas(W, H);

        return (ctx, t, beat) => {
            const dt = Math.min(0.1, t - last);
            last = t;
            ctx.drawImage(back.canvas, 0, 0);
            for (const c of clouds) {
                const x = Math.round(((c.x + t * c.speed) % (W + c.c.canvas.width)) - c.c.canvas.width);
                ctx.drawImage(c.c.canvas, x, c.y);
            }

            // Pickup crossing the far road, left to right, then a pause.
            const p = (t % truckPeriod) / (truckPeriod * 0.8);
            const tx = Math.round(-10 + p * (W + 20));
            const ty = roadY(tx) - 3;
            if (p < 1) {
                ctx.fillStyle = '#2f6aa8';
                ctx.fillRect(tx - 3, ty, 7, 2);
                ctx.fillRect(tx + 1, ty - 2, 3, 2);
                ctx.fillStyle = '#bfe0f2';
                ctx.fillRect(tx + 2, ty - 2, 1, 1);
                ctx.fillStyle = '#1b1b22';
                ctx.fillRect(tx - 2, ty + 2, 1, 1);
                ctx.fillRect(tx + 2, ty + 2, 1, 1);
                if (t > nextPuff) {
                    const d = dust.reduce((a, b) => (b.age > a.age ? b : a));
                    d.x = tx - 4;
                    d.y = ty + 1;
                    d.age = 0;
                    nextPuff = t + 0.12;
                }
            }
            // Dust drifts up and back, swells and fades.
            const dc = dustLayer.ctx;
            dc.clearRect(0, 0, W, H);
            for (const d of dust) {
                d.age += dt;
                if (d.age > d.life) continue;
                const f = d.age / d.life;
                const r = 1 + Math.round(f * 3);
                dc.fillStyle = `rgba(226,204,160,${(0.7 * (1 - f)).toFixed(2)})`;
                const x = Math.round(d.x - f * 6), y = Math.round(d.y - f * 7);
                dc.fillRect(x - r, y - r + 1, r * 2, r * 2 - 1);
                dc.fillRect(x - r + 1, y - r, r * 2 - 2, r * 2 + 1);
            }
            ctx.drawImage(dustLayer.canvas, 0, 0);

            ctx.drawImage(props.canvas, 0, 0);

            // Weathervane: a rooster-tailed arrow turning slowly about its pole.
            ctx.fillStyle = '#2a2224';
            ctx.fillRect(vane.x, vane.y - 9, 1, 9);
            ctx.fillRect(vane.x - 2, vane.y - 4, 5, 1);
            const heading = Math.sin(t * 0.23) * 2.2 + Math.sin(t * 0.71) * 0.5;
            const reach = Math.cos(heading) * 6;
            const tip = Math.round(reach), tail = Math.round(-reach);
            const y = vane.y - 7;
            ctx.fillRect(Math.min(tip, tail) + vane.x, y, Math.abs(tip - tail) + 1, 1);
            const dir = Math.sign(reach) || 1;
            if (Math.abs(reach) > 1.5) {
                ctx.fillRect(vane.x + tip - dir, y - 1, 1, 3);
                ctx.fillRect(vane.x + tail, y - 2, 1 + (Math.abs(reach) > 3 ? 1 : 0), 3);
            }

            // Morning light swells a touch with the beat.
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = `rgba(255,236,190,${(0.04 + 0.03 * pulse(beat)).toFixed(3)})`;
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = 'source-over';
        };
    }
};
