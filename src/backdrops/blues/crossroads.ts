import {Backdrop, canvas, css, disc, ditherPick, hash, hex, pixels, pulse, RGB, rng, wrappingNoise} from '../pixel';

/**
 * A crossroads at midnight under a huge moon: two dirt roads meet by a
 * weathered signpost with a crow on top, telegraph poles march to the horizon,
 * thin clouds slide past, and the wind drags dust and the odd tumbleweed across.
 */
export const CROSSROADS: Backdrop = {
    id: 'blues-crossroads',
    name: 'Crossroads',
    bpm: 60,
    create(W, H) {
        const random = rng(66);
        const cx = Math.round(W / 2);
        const horizon = 104;
        const crossTop = 126, crossBottom = 138;
        const moon = {x: cx - Math.round(W * 0.16), y: 44, r: 22};
        const roadHalf = (y: number) => 1 + (y - horizon) * 0.9;

        const sky = ['#020309', '#05081a', '#0a102a', '#121a3c', '#1d2850', '#2e3a66', '#45507a'].map(hex);
        const land = ['#030408', '#070912', '#0c101c', '#141a2a', '#1e263a'].map(hex);
        const dirt = ['#0c0d14', '#181a24', '#262836', '#383a4a', '#4e4e60', '#6a687a'].map(hex);
        const moonPal = ['#9a9a9a', '#c8c4b4', '#e8e2cc', '#fbf6e2'].map(hex);
        const black = hex('#020205');

        const moonLight = (x: number, y: number) => Math.max(0, 1 - Math.hypot(x - moon.x, (y - moon.y) * 0.8) / (W * 0.6));

        const back = pixels(W, H, put => {
            for (let y = 0; y < horizon; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, (y / horizon) * 0.85 + moonLight(x, y) * 0.3, x, y));
            const craters = wrappingNoise(64, 64, 9, random);
            disc(put, moon.x, moon.y, moon.r, (x, y) => {
                const n = craters(x - moon.x + 32, y - moon.y + 32);
                const shade = 0.95 - Math.max(0, (x - moon.x) + (y - moon.y)) / (moon.r * 3);
                return ditherPick(moonPal, shade - (n > 0.64 ? 0.3 : n > 0.56 ? 0.14 : 0), x, y);
            });
            // Land, lighter near the horizon.
            for (let y = horizon; y < H; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(land, 0.75 - (y - horizon) / 90 + moonLight(x, horizon) * 0.2, x, y));
            // Low hills on the horizon.
            for (let x = 0; x < W; x++) {
                const h = Math.round(3 + 2 * Math.sin(x * 0.03 + 1) + Math.sin(x * 0.11) + 1.5 * Math.sin(x * 0.007));
                for (let y = horizon - h; y < horizon + 1; y++) put(x, y, land[1]);
            }
            // Road to the horizon, and the road across it.
            for (let y = horizon; y < H; y++) {
                const hw = roadHalf(y);
                for (let x = Math.floor(cx - hw - 1); x <= Math.ceil(cx + hw + 1); x++) {
                    const u = (x - cx) / hw;
                    if (Math.abs(u) > 1) {
                        if (Math.abs(u) < 1 + 1.5 / hw && hash(x, y) > 0.5) put(x, y, dirt[1]);
                        continue;
                    }
                    let v = 0.42 - Math.abs(u) * 0.25 + (y - horizon) / 400;
                    if (Math.abs(Math.abs(u) - 0.45) < 0.08) v -= 0.25;
                    put(x, y, ditherPick(dirt, v, x, y));
                }
            }
            for (let y = crossTop; y < crossBottom; y++) {
                for (let x = 0; x < W; x++) {
                    let v = 0.36 + (y - crossTop) / 50 - Math.abs(x - cx) / (W * 1.5);
                    if (y === crossTop + 3 || y === crossBottom - 4) v -= 0.22;
                    put(x, y, ditherPick(dirt, v, x, y));
                }
                for (const edge of [crossTop - 1, crossBottom]) {
                    for (let x = 0; x < W; x++) if (hash(x, edge) > 0.55) put(x, edge, dirt[1]);
                }
            }
            // Scrub.
            for (let i = 0; i < W / 4; i++) {
                const y = horizon + 3 + Math.floor(Math.pow(random(), 1.5) * (H - horizon - 3));
                const x = Math.floor(random() * W);
                if (Math.abs(x - cx) < roadHalf(y) + 3 || (y > crossTop - 3 && y < crossBottom + 3)) continue;
                const s = 1 + Math.floor((y - horizon) / 25);
                for (let k = 0; k < s * 3; k++) put(x + Math.floor(random() * s * 3) - s, y - Math.floor(random() * s * 1.5), land[0]);
            }
        });

        // Telegraph poles marching to the horizon along the road.
        const poles = pixels(W, H, put => {
            const tops: Array<[number, number]> = [];
            for (let k = 1; k <= 7; k++) {
                const yb = horizon + 70 / (k * 1.4);
                const s = (yb - horizon) / 50;
                const x = Math.round(cx + roadHalf(yb) + 14 * s);
                const h = Math.round(64 * s);
                for (let y = Math.round(yb) - h; y <= Math.round(yb); y++) {
                    put(x, y, black);
                    if (s > 0.6) put(x + 1, y, black);
                }
                const arm = Math.max(1, Math.round(5 * s));
                for (let ax = x - arm; ax <= x + arm; ax++) put(ax, Math.round(yb) - h + Math.round(3 * s), black);
                tops.push([x, Math.round(yb) - h + Math.round(3 * s)]);
            }
            for (let i = 0; i < tops.length - 1; i++) {
                const [x0, y0] = tops[i], [x1, y1] = tops[i + 1];
                for (let x = x1; x <= x0; x++) {
                    const f = (x - x0) / (x1 - x0);
                    put(x, y0 + (y1 - y0) * f + Math.sin(f * Math.PI) * 3 * (1 - i / tops.length), black, 200);
                }
            }
        });

        // Signpost and a dead tree at the near corners.
        const sign = {x: cx + 30, y: crossTop - 1};
        const props = pixels(W, H, put => {
            const wood = ['#14121a', '#2a2630', '#46404a', '#6e6672', '#9c94a0'].map(hex);
            for (let y = sign.y - 44; y <= sign.y; y++)
                for (let x = sign.x - 1; x <= sign.x + 1; x++) put(x, y, ditherPick(wood, x === sign.x - 1 ? 0.75 : 0.3, x, y));
            const board = (x0: number, x1: number, y0: number, tilt: number, dir: number) => {
                for (let x = x0; x <= x1; x++) {
                    const dy = Math.round((x - x0) * tilt);
                    const tip = dir < 0 ? x - x0 : x1 - x;
                    for (let y = 0; y < 5; y++) {
                        if (tip < 3 && Math.abs(y - 2) > tip) continue;
                        const v = y === 0 ? 0.8 : y === 4 ? 0.15 : 0.45 + (hash(x, y) - 0.5) * 0.2;
                        put(x, y0 + y + dy, ditherPick(wood, v, x, y0 + y));
                    }
                    if (x % 4 === 1 && tip > 4) put(x, y0 + 2 + dy, wood[1]);
                }
            };
            board(sign.x - 20, sign.x + 2, sign.y - 40, 0.04, -1);
            board(sign.x - 2, sign.x + 18, sign.y - 31, -0.08, 1);
            // The dead tree: gnarled, recursive branches.
            const tree = {x: cx - Math.round(W * 0.2), y: crossTop - 2};
            const branch = (x: number, y: number, a: number, len: number, w: number, depth: number) => {
                for (let i = 0; i < len; i++) {
                    x += Math.cos(a);
                    y += Math.sin(a);
                    a += (random() - 0.5) * 0.25;
                    for (let k = 0; k < w; k++) put(x + k - Math.floor(w / 2), y, black);
                }
                if (depth <= 0) return;
                const n = 2 + (random() < 0.4 ? 1 : 0);
                for (let j = 0; j < n; j++)
                    branch(x, y, a + (j - (n - 1) / 2) * 0.7 + (random() - 0.5) * 0.3, len * (0.55 + random() * 0.2), Math.max(1, w - 1), depth - 1);
            };
            branch(tree.x, tree.y, -Math.PI / 2 - 0.1, 22, 4, 4);
            for (let x = tree.x - 4; x <= tree.x + 4; x++) put(x, tree.y, black);
        });

        // Clouds and dust: noise strips scrolled at different speeds.
        const cloudNoise = wrappingNoise(W, 60, 18, random), fine = wrappingNoise(W, 60, 6, random);
        const clouds = pixels(W, 60, put => {
            const lit = hex('#8a8eb0'), body = hex('#1c2240');
            for (let y = 0; y < 60; y++)
                for (let x = 0; x < W; x++) {
                    const band = Math.exp(-Math.pow((y - 30) / 12, 2));
                    const v = (cloudNoise(x, y) * 0.7 + fine(x, y * 2) * 0.3) * band;
                    if (v > 0.42) put(x, y, v > 0.5 && cloudNoise(x, y - 2) * band < 0.45 ? lit : body, 200);
                }
        });
        const dustNoise = wrappingNoise(W, H, 22, random), dustFine = wrappingNoise(W, H, 7, random);
        const dust = pixels(W, H, put => {
            const c = hex('#7a7488');
            for (let y = horizon; y < H; y++)
                for (let x = 0; x < W; x++) {
                    const v = (dustNoise(x, y) * 0.6 + dustFine(x, y) * 0.4) * Math.min(1, (y - horizon) / 30);
                    if (v > 0.45) put(x, y, c, Math.round((v - 0.45) * 300));
                }
        });
        const grit = Array.from({length: 70}, () => ({x: random() * W, y: horizon + 6 + random() * (H - horizon - 6), sp: 30 + random() * 50, ph: random() * 9}));

        // Tumbleweed: a scribbled ball, rotated as it rolls.
        const weed: Array<[number, number]> = [];
        for (let i = 0; i < 70; i++) {
            const a = random() * Math.PI * 2, r = 2 + random() * 4;
            weed.push([Math.cos(a) * r, Math.sin(a) * r]);
        }
        const weedColour = hex('#5a4a40');

        const stars = Array.from({length: 120}, () => ({x: Math.floor(random() * W), y: Math.floor(random() * (horizon - 10)), b: random()}))
            .filter(s => Math.hypot(s.x - moon.x, s.y - moon.y) > moon.r + 6);
        const halo: RGB = hex('#b8c4ff');
        const layer = canvas(W, H);

        return (ctx, t, beat) => {
            const breath = pulse(beat);
            ctx.drawImage(back.canvas, 0, 0);

            for (const s of stars) {
                const tw = hash(s.x, Math.floor(t * 2 + s.b * 10)) > 0.92 ? 0.25 : 1;
                ctx.fillStyle = `rgba(220,226,255,${(0.25 + s.b * 0.6 * tw).toFixed(3)})`;
                ctx.fillRect(s.x, s.y, 1, 1);
            }

            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(moon.x, moon.y, moon.r - 2, moon.x, moon.y, moon.r * 3.2);
            g.addColorStop(0, css(halo, 0.16 + 0.06 * breath));
            g.addColorStop(1, css(halo, 0));
            ctx.fillStyle = g;
            ctx.fillRect(moon.x - moon.r * 4, moon.y - moon.r * 4, moon.r * 8, moon.r * 8);
            ctx.globalCompositeOperation = 'source-over';

            const cx0 = Math.floor(t * 1.5) % W;
            ctx.globalAlpha = 0.75;
            ctx.drawImage(clouds.canvas, -cx0, 22);
            ctx.drawImage(clouds.canvas, W - cx0, 22);
            ctx.globalAlpha = 1;

            ctx.drawImage(poles.canvas, 0, 0);

            // Dust sweeps across the land.
            const l = layer.ctx;
            l.clearRect(0, 0, W, H);
            const d0 = Math.floor(t * 16) % W;
            l.drawImage(dust.canvas, d0, 0);
            l.drawImage(dust.canvas, d0 - W, 0);
            ctx.globalAlpha = 0.35;
            ctx.drawImage(layer.canvas, 0, 0);
            ctx.globalAlpha = 1;

            ctx.drawImage(props.canvas, 0, 0);

            // The crow on the post turns its head now and then.
            const look = hash(Math.floor(t / 3.5), 7) > 0.5 ? 1 : -1;
            const hop = hash(Math.floor(t / 3.5), 9) > 0.85 && (t % 3.5) < 0.25 ? 1 : 0;
            const crow = {x: sign.x, y: sign.y - 45 - hop};
            ctx.fillStyle = '#020205';
            ctx.fillRect(crow.x - 2, crow.y - 3, 5, 3);
            ctx.fillRect(crow.x - 3 * look - (look < 0 ? 0 : 1), crow.y - 2, 2, 1);
            ctx.fillRect(crow.x + 2 * look - (look < 0 ? 1 : 0), crow.y - 5, 2, 2);
            ctx.fillStyle = '#6a6070';
            ctx.fillRect(crow.x + 4 * look - (look < 0 ? 0 : 0), crow.y - 4, 1, 1);

            // Tumbleweed every sixteen seconds, rolling along the cross road.
            const cycle = (t % 16) / 16;
            if (cycle < 0.6) {
                const f = cycle / 0.6;
                const x = -10 + f * (W + 20);
                const y = crossTop + 6 - Math.abs(Math.sin(f * 14)) * 5;
                const a = x / 5, ca = Math.cos(a), sa = Math.sin(a);
                ctx.fillStyle = css(weedColour);
                for (const [px, py] of weed) ctx.fillRect(Math.round(x + px * ca - py * sa), Math.round(y + px * sa + py * ca), 1, 1);
            }

            for (const p of grit) {
                const x = ((p.x + t * p.sp) % (W + 10)) - 5;
                const y = Math.round(p.y + Math.sin(t * 2 + p.ph) * 2);
                ctx.fillStyle = 'rgba(160,150,170,0.35)';
                ctx.fillRect(Math.round(x), y, p.sp > 60 ? 2 : 1, 1);
            }
        };
    }
};
