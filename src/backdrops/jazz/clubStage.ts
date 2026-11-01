import {Backdrop, canvas, css, ditherPick, hex, pixels, pulse, RGB, rng, wrappingNoise} from '../pixel';

/**
 * An empty jazz club stage between sets: one warm spotlight on a saxophone
 * resting on its stand, an upright bass and a grand piano at the edges of the
 * light, and smoke from a forgotten cigarette curling up through the beam.
 */
export const CLUB_STAGE: Backdrop = {
    id: 'jazz-club-stage',
    name: 'Club stage',
    bpm: 92,
    create(W, H) {
        const random = rng(41);
        const cx = Math.round(W / 2);
        const floorY = Math.round(H * 0.7);
        const pool = {x: cx, y: Math.round(H * 0.84)};
        const coneHalf = Math.max(34, Math.round(W * 0.15));
        const pianoX = cx + Math.round(W * 0.1);

        // How much of the spotlight a point gets, 0..1.
        const lightAt = (x: number, y: number) => {
            const dx = (x - cx) / (W * 0.24), dy = (y - pool.y) / (H * 0.55);
            return Math.exp(-(dx * dx + dy * dy) * 1.6);
        };
        const inCone = (x: number, y: number) => {
            if (y > pool.y + 6) return 0;
            const half = 4 + (Math.max(0, y) / pool.y) * coneHalf;
            return Math.min(1, Math.max(0, (half - Math.abs(x - cx)) / 6));
        };

        const curtain = ['#070105', '#14030a', '#2a0812', '#470f1d', '#6e1a28', '#9a2c32', '#c4523e'].map(hex);
        const wood = ['#0a0503', '#1a0d07', '#33190c', '#552c14', '#7e461f', '#ab6a30', '#d49548'].map(hex);
        const brass = ['#2a1a06', '#5c3c0e', '#93661a', '#c99a2c', '#efcd62', '#fff3c4'].map(hex);
        const lacquer = ['#020204', '#08080d', '#141420', '#262636', '#45455c', '#7a7a96'].map(hex);
        const fringe = hex('#b88a34');

        // Curtain with folds, a scalloped valance, and the stage boards.
        const back = pixels(W, H, put => {
            for (let y = 0; y < floorY; y++) {
                for (let x = 0; x < W; x++) {
                    const fold = 0.5 + 0.5 * Math.sin(((x + Math.sin(y * 0.05) * 2) * Math.PI * 2) / 13);
                    const l = lightAt(x, y);
                    const v = 0.05 + l * 0.6 + fold * 0.25 * (0.35 + l) - (1 - y / floorY) * 0.12;
                    put(x, y, ditherPick(curtain, v, x, y));
                }
            }
            for (let x = 0; x < W; x++) {
                const edge = 11 + Math.round(3 * Math.abs(Math.sin((x * Math.PI) / 18)));
                for (let y = 0; y < edge; y++) put(x, y, ditherPick(curtain, 0.12 + lightAt(x, 60) * 0.35, x, y));
                put(x, edge, fringe);
                if (x % 2 === 0) put(x, edge + 1, fringe);
            }
            // Boards get taller towards the viewer.
            let row = floorY, k = 0;
            while (row < H) {
                const h = 2 + Math.floor(k * 0.9);
                const seamEvery = 18 + k * 9;
                const shift = Math.floor(random() * seamEvery);
                for (let y = row; y < Math.min(H, row + h); y++) {
                    for (let x = 0; x < W; x++) {
                        const dx = (x - pool.x) / (W * 0.2), dy = (y - pool.y) / 16;
                        const spot = Math.exp(-(dx * dx + dy * dy));
                        let v = 0.1 + spot * 0.75 + lightAt(x, y) * 0.15;
                        if (y === row || (x + shift) % seamEvery === 0) v -= 0.18;
                        put(x, y, ditherPick(wood, v, x, y));
                    }
                }
                row += h;
                k++;
            }
            // The stage lip.
            for (let x = 0; x < W; x++) put(x, floorY, ditherPick(wood, 0.05, x, floorY));
        });

        // The instruments, shaded by the spotlight.
        const stuff = pixels(W, H, put => {
            // Upright bass, leaning slightly.
            const bx = cx - Math.round(W * 0.21), base = pool.y + 2;
            const lean = 0.12;
            for (let y = 50; y <= base; y++) {
                for (let u = -18; u <= 18; u++) {
                    const x = Math.round(bx + u - (base - y) * lean);
                    const lower = (u * u) / 256 + ((y - 133) * (y - 133)) / 256 <= 1;
                    const upper = (u * u) / 121 + ((y - 108) * (y - 108)) / 144 <= 1;
                    const waist = y > 106 && y < 133 && Math.abs(u) <= 9;
                    const l = lightAt(x, y);
                    if (lower || upper || waist) {
                        const rx = y > 120 ? 16 : 11;
                        let v = 0.28 + 0.32 * (1 - Math.abs(u / rx - 0.4)) + l * 0.4;
                        if (Math.abs(u) === Math.floor(rx * 0.95)) v -= 0.25;
                        if ((u === 6 || u === -6) && y > 117 && y < 129) v = 0.02;
                        if ((u === 7 || u === -5) && (y === 117 || y === 128)) v = 0.02;
                        if (y === 126 && Math.abs(u) <= 4) v = 0.9;
                        put(x, y, ditherPick(wood, v, x, y));
                    }
                    if (Math.abs(u) <= 1 && y >= 56 && y <= 124) put(x, y, ditherPick(lacquer, 0.12 + l * 0.3 + (u === 1 ? 0.2 : 0), x, y));
                    if (u === 0 && y > 60 && y < 140) put(x, y, ditherPick(brass, 0.3 + l * 0.4, x, y));
                    if (Math.abs(u) <= 2 && y >= 50 && y < 58) put(x, y, ditherPick(wood, 0.3 + l * 0.4 - (y < 53 && u > 0 ? 0.2 : 0), x, y));
                    if (u === -3 && (y === 52 || y === 55)) put(x, y, wood[1]);
                    if (u === 3 && (y === 53 || y === 56)) put(x, y, wood[1]);
                    if (u === 0 && y > 145) put(x, y + 3, lacquer[3]);
                }
            }

            // Saxophone on its stand, centre of the pool.
            const sx = cx - 6, sy = pool.y + 1, s = 1.15;
            const path: Array<[number, number, number]> = [
                [-5, -46, 0.8], [-2, -45, 1], [1, -43, 1.2], [2, -39, 1.5], [2, -30, 1.8], [2, -18, 2.2],
                [3, -9, 2.6], [5, -4, 2.9], [8, -4, 3], [10, -8, 3.1], [11, -13, 3.5], [12, -17, 4.2], [12.5, -20, 4.8]
            ];
            const stand = lacquer[4];
            for (let i = 0; i <= 10; i++) {
                put(sx + 3 - i, sy - 1 + Math.round(i * 0.2), stand);
                put(sx + 6 + i, sy - 1 + Math.round(i * 0.2), stand);
            }
            for (let y = sy - 14; y < sy; y++) put(sx + 5, y, stand);
            for (let i = 0; i < path.length - 1; i++) {
                const [x0, y0, r0] = path[i], [x1, y1, r1] = path[i + 1];
                const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3);
                for (let k = 0; k <= steps; k++) {
                    const f = k / steps;
                    const px = sx + (x0 + (x1 - x0) * f) * s, py = sy + (y0 + (y1 - y0) * f) * s, r = (r0 + (r1 - r0) * f) * s;
                    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
                        for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
                            if (dx * dx + dy * dy > r * r + 0.3) continue;
                            const v = 0.12 + 0.6 * (1 - (dx / Math.max(r, 1) + 1) / 2) + lightAt(px, py) * 0.25 - (dy > r * 0.5 ? 0.1 : 0);
                            put(px + dx, py + dy, ditherPick(brass, v, Math.round(px + dx), Math.round(py + dy)));
                        }
                    }
                }
            }
            // Bell mouth, keys.
            for (let dx = -5; dx <= 5; dx++) put(sx + 12.5 * s + dx, sy - 20 * s - 5, brass[Math.abs(dx) > 3 ? 4 : 5]);
            for (let dx = -4; dx <= 4; dx++) put(sx + 12.5 * s + dx, sy - 20 * s - 4, brass[0]);
            for (let dx = -3; dx <= 3; dx++) put(sx + 12.5 * s + dx, sy - 20 * s - 3, brass[1]);
            for (let k = 0; k < 6; k++) put(sx + 2 * s + 2, sy + (-34 + k * 4.5) * s, brass[1]);

            // Grand piano on the right, lid up.
            const p0 = pianoX, p1 = Math.min(W - 6, p0 + 86);
            const top = 108;
            const gloss = (x: number, y: number, extra = 0) => ditherPick(lacquer, 0.08 + lightAt(x, y) * 0.45 + extra, x, y);
            for (let x = p0; x <= p1; x++) {
                const tail = x > p1 - 12 ? Math.round(Math.pow((x - (p1 - 12)) / 12, 2) * 6) : 0;
                for (let y = top + tail; y <= top + 14; y++) put(x, y, gloss(x, y, y === top + tail ? 0.5 : y > top + 11 ? -0.05 : 0));
            }
            for (let x = p0 - 7; x < p0; x++) {
                for (let y = top + 3; y <= top + 9; y++) put(x, y, gloss(x, y));
                put(x, top + 3, hex(x % 2 ? '#e8dfc8' : '#bdb39c'));
            }
            for (let i = 0; i <= p1 - p0 - 8; i++) {
                const x = p0 + 6 + i, y = Math.round(top - 1 - i * 0.42);
                put(x, y, gloss(x, y, 0.35));
                put(x, y + 1, gloss(x, y, 0.1));
                put(x, y + 2, gloss(x, y));
                for (let yy = y + 3; yy < top && yy < y + 3 + i * 0.12; yy++) put(x, yy, gloss(x, yy, -0.05));
            }
            for (let y = top - 22; y < top; y++) put(p1 - 26, y, lacquer[3]);
            for (const lx of [p0 + 2, p1 - 10]) {
                for (let y = top + 14; y <= pool.y + 2; y++) {
                    put(lx, y, gloss(lx, y, 0.15));
                    put(lx + 1, y, gloss(lx + 1, y));
                    put(lx + 2, y, gloss(lx + 2, y, -0.05));
                }
                put(lx - 1, pool.y + 2, brass[2]);
                put(lx + 3, pool.y + 2, brass[2]);
            }
            for (let y = top + 14; y <= pool.y; y++) put(p0 + 14, y, lacquer[3]);
            // Ashtray on the case.
            for (let dx = -3; dx <= 3; dx++) put(p0 + 4 + dx, top - 1, hex('#5a5a66'));
            put(p0 + 7, top - 2, hex('#e8e0d0'));
            put(p0 + 8, top - 2, hex('#e8e0d0'));
        });
        const ember = {x: pianoX + 9, y: 106};

        // Haze in the beam: noise scrolled under a cone-shaped mask.
        const warm = hex('#ffd9a0');
        const big = wrappingNoise(W, H, 26, random), small = wrappingNoise(W, H, 8, random);
        const haze = pixels(W, H, put => {
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) put(x, y, warm, Math.round((big(x, y) * 0.75 + small(x, y) * 0.25) * 255));
        });
        const mask = pixels(W, H, put => {
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) {
                    const a = inCone(x, y) * (1 - 0.45 * y / pool.y);
                    if (a > 0) put(x, y, warm, Math.round(a * 255));
                }
        });
        const beam = canvas(W, H);

        const motes = Array.from({length: 45}, () => ({
            x: cx + (random() - 0.5) * coneHalf * 1.6, y: random() * pool.y, ph: random() * 10, sp: 1 + random() * 2
        }));
        const smoke: RGB = hex('#e6ddd2');

        return (ctx, t, beat) => {
            const breath = pulse(beat);
            ctx.drawImage(back.canvas, 0, 0);

            // Pool of light on the boards.
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.translate(pool.x, pool.y);
            ctx.scale(1, 0.22);
            const g = ctx.createRadialGradient(0, 0, 2, 0, 0, coneHalf * 1.3);
            g.addColorStop(0, css(warm, 0.22 + 0.06 * breath));
            g.addColorStop(1, css(warm, 0));
            ctx.fillStyle = g;
            ctx.fillRect(-coneHalf * 1.5, -coneHalf * 1.5, coneHalf * 3, coneHalf * 3);
            ctx.restore();

            ctx.drawImage(stuff.canvas, 0, 0);

            const b = beam.ctx;
            const drift = Math.floor(t * 2) % W;
            b.globalCompositeOperation = 'source-over';
            b.clearRect(0, 0, W, H);
            b.globalAlpha = 0.6;
            b.drawImage(haze.canvas, -drift, Math.round(Math.sin(t * 0.2) * 3));
            b.drawImage(haze.canvas, W - drift, Math.round(Math.sin(t * 0.2) * 3));
            b.globalAlpha = 1;
            b.globalCompositeOperation = 'destination-in';
            b.drawImage(mask.canvas, 0, 0);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.16 + 0.05 * breath;
            ctx.drawImage(mask.canvas, 0, 0);
            ctx.globalAlpha = 0.35 + 0.08 * breath;
            ctx.drawImage(beam.canvas, 0, 0);
            ctx.globalAlpha = 1;

            // Dust drifting in the light.
            for (const m of motes) {
                const y = ((m.y + t * m.sp) % pool.y);
                const x = Math.round(m.x + Math.sin(t * 0.4 + m.ph) * 4);
                const a = inCone(x, y) * (0.3 + 0.4 * Math.max(0, Math.sin(t * 1.5 + m.ph)));
                if (a <= 0.02) continue;
                ctx.fillStyle = css(warm, a);
                ctx.fillRect(x, Math.round(y), 1, 1);
            }
            ctx.globalCompositeOperation = 'source-over';

            // Smoke ribbons drift up and left into the beam.
            for (let strand = 0; strand < 2; strand++) {
                for (let k = 0; k < 80; k++) {
                    const f = k / 80;
                    const y = ember.y - 2 - k * 1.15;
                    const x = ember.x - k * 0.3 * (1 + strand * 0.5)
                        + Math.sin(k * 0.11 - t * 1.1 + strand * 2) * (1 + k * 0.12)
                        + Math.sin(k * 0.31 - t * 2.3 + strand) * Math.min(3, k * 0.06);
                    const lit = 0.5 + 0.5 * inCone(x, y);
                    const w = 1 + Math.floor(k / 22);
                    const a = (0.6 / Math.sqrt(w)) * Math.pow(1 - f, 1.3) * lit;
                    ctx.fillStyle = css(smoke, a);
                    ctx.fillRect(Math.round(x - w / 2), Math.round(y), w, 1);
                }
            }
            ctx.fillStyle = css(hex('#ff7a2a'), 0.6 + 0.4 * breath);
            ctx.fillRect(ember.x, ember.y, 1, 1);
        };
    }
};
