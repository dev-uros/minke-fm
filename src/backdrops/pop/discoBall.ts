import {Backdrop, canvas, css, ditherPick, hash, hex, pixels, pulse, RGB, rng} from '../pixel';

/**
 * A mirror ball turning over an empty dance floor: its reflections sweep
 * across the walls and boards while the floor tiles light up in patterns
 * that change on the beat, under a neon heart.
 */
export const DISCO_BALL: Backdrop = {
    id: 'pop-disco-ball',
    name: 'Mirror ball',
    bpm: 120,
    create(W, H) {
        const random = rng(77);
        const cx = Math.round(W / 2);
        const floorY = 108;
        const ball = {x: cx, y: 30, r: 15};

        const wall = ['#14062e', '#220a46', '#33105e', '#4a1670', '#62207e'].map(hex);
        const tiles = ['#ff4fa8', '#3fe0ff', '#ffe14a', '#7dff5a', '#b36bff'].map(hex);

        const back = pixels(W, H, put => {
            for (let y = 0; y < floorY; y++) {
                for (let x = 0; x < W; x++) {
                    const stripe = Math.floor(x / 12) % 2 === 0 ? 0.06 : 0;
                    const glow = 1 - Math.min(1, Math.hypot(x - cx, (y - 60) * 1.5) / (W * 0.6));
                    put(x, y, ditherPick(wall, (y / floorY) * 0.45 + glow * 0.45 + stripe, x, y));
                }
            }
            for (let x = 0; x < W; x++) {
                put(x, floorY - 3, hex('#7a3a9a'));
                put(x, floorY - 2, hex('#1a0828'));
                put(x, floorY - 1, hex('#1a0828'));
            }
            for (let y = floorY; y < H; y++) for (let x = 0; x < W; x++) put(x, y, hex('#0c0418'));
            // Speaker stacks at either side of the room.
            for (const sx of [Math.round(W * 0.08), Math.round(W * 0.92) - 16]) {
                for (let y = floorY - 34; y < floorY + 4; y++) {
                    for (let x = sx; x < sx + 16; x++) {
                        const edge = x === sx || x === sx + 15 || y === floorY - 34 || y === floorY - 15;
                        put(x, y, hex(edge ? '#2e1a40' : '#120a1c'));
                    }
                }
                for (const [cy, r] of [[floorY - 26, 5], [floorY - 6, 6]] as const) {
                    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
                        const d = x * x + y * y;
                        if (d <= r * r) put(sx + 8 + x, cy + y, hex(d > (r - 1) * (r - 1) ? '#3a2650' : d < 3 ? '#4a3a60' : '#06030c'));
                    }
                }
            }
        });

        // Floor tiles in perspective, converging behind the room.
        const rows = 7, vpY = floorY - 70;
        const rowEdge = (i: number) => Math.round(floorY + (H - floorY) * Math.pow(i / rows, 1.45));
        const colAt = (j: number, y: number) => cx + (j - 0.5) * 34 * (y - vpY) / (H - vpY);
        const spanJ = Math.ceil(W / 2 / 34 * (H - vpY) / (floorY - vpY)) + 1;
        const rowOf: number[] = [];
        for (let i = 0; i < rows; i++) for (let y = rowEdge(i); y < rowEdge(i + 1); y++) rowOf[y] = i;

        // Mirror ball, redrawn each frame on its own little canvas.
        const size = ball.r * 2 + 1;
        const ballLayer = canvas(size, size);
        const ballImg = ballLayer.ctx.createImageData(size, size);

        const spots = Array.from({length: 110}, () => {
            const onFloor = random() < 0.4;
            return {
                lon: random() * Math.PI * 2,
                y: onFloor ? floorY + 4 + random() * (H - floorY - 6) : 4 + random() * (floorY - 12),
                tint: random() < 0.6 ? 0 : 1 + Math.floor(random() * tiles.length),
                spread: 0.6 + random() * 0.5
            };
        });

        const heart = [
            '.##...##.',
            '#..#.#..#',
            '#...#...#',
            '#.......#',
            '.#.....#.',
            '..#...#..',
            '...#.#...',
            '....#....'
        ];

        const mix = (c: RGB, f: number): string => css([Math.round(c[0] * f + 12 * (1 - f)), Math.round(c[1] * f + 4 * (1 - f)), Math.round(c[2] * f + 24 * (1 - f))]);

        return (ctx, t, beat) => {
            const kick = pulse(beat);
            const b = Math.floor(beat);
            const mode = Math.floor(beat / 16) % 3;
            const rot = t * 0.7;

            ctx.drawImage(back.canvas, 0, 0);

            // Dance floor.
            for (let y = floorY; y < H; y++) {
                const i = rowOf[y];
                if (y === rowEdge(i)) continue;
                for (let j = -spanJ; j <= spanJ; j++) {
                    const x0 = Math.round(colAt(j, y)), x1 = Math.round(colAt(j + 1, y));
                    if (x1 < 0 || x0 > W) continue;
                    let lit: boolean;
                    if (mode === 0) lit = ((i + j + b) & 1) === 0;
                    else if (mode === 1) lit = ((Math.abs(j) + rows - i + 400 - b) % 4) === 0;
                    else lit = hash(i * 31 + j, b) > 0.62;
                    const colour = tiles[(((i * 2 + j) % 5) + 5) % 5];
                    ctx.fillStyle = mix(colour, lit ? 0.7 + 0.3 * kick : 0.2);
                    ctx.fillRect(x0 + 1, y, Math.max(0, x1 - x0 - 1), 1);
                }
            }

            // Neon heart that flickers on with the beat.
            const hx = cx - 4, hy = 58;
            const on = 0.65 + 0.35 * kick;
            ctx.globalCompositeOperation = 'lighter';
            const halo = ctx.createRadialGradient(cx, hy + 4, 1, cx, hy + 4, 18);
            halo.addColorStop(0, `rgba(255,60,170,${(0.3 * on).toFixed(3)})`);
            halo.addColorStop(1, 'rgba(255,60,170,0)');
            ctx.fillStyle = halo;
            ctx.fillRect(cx - 18, hy - 14, 36, 36);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = css([255, 120 + Math.round(100 * kick), 210], 0.6 + 0.4 * on);
            heart.forEach((row, y) => [...row].forEach((ch, x) => {
                if (ch === '#') ctx.fillRect(hx + x, hy + y, 1, 1);
            }));

            // Coloured spotlights from the top corners onto the ball.
            ctx.globalCompositeOperation = 'lighter';
            const [ca, cb] = [tiles[Math.floor(beat / 8) % 5], tiles[(Math.floor(beat / 8) + 2) % 5]];
            for (const [sx, c] of [[0, ca], [W, cb]] as const) {
                ctx.fillStyle = css(c, 0.07 + 0.05 * kick);
                ctx.beginPath();
                ctx.moveTo(sx, 0);
                ctx.lineTo(ball.x, ball.y - ball.r);
                ctx.lineTo(ball.x, ball.y + ball.r);
                ctx.lineTo(sx, 10);
                ctx.fill();
            }

            // Light spots thrown round the room by the turning ball.
            for (const s of spots) {
                const phase = s.lon + rot;
                const facing = Math.cos(phase);
                if (facing < 0.05) continue;
                const x = Math.round(ball.x + Math.sin(phase) * W * 0.7 * s.spread);
                const big = s.y > floorY ? 2 + Math.floor((s.y - floorY) / 40) : 2;
                const c: RGB = s.tint === 0 ? [255, 250, 235] : tiles[s.tint - 1];
                const a = facing * (0.65 + 0.35 * kick);
                const y = Math.round(s.y);
                ctx.fillStyle = css(c, a * 0.22);
                ctx.fillRect(x - 2, y - 1, big + 4, big + 2);
                ctx.fillStyle = css(c, a);
                ctx.fillRect(x, y, big, big);
                // A faint streak behind, since the spots are moving.
                ctx.fillStyle = css(c, a * 0.35);
                ctx.fillRect(x - 3, y + (big > 2 ? 1 : 0), 3, 1);
            }
            ctx.globalCompositeOperation = 'source-over';

            // The ball itself: facets shaded by orientation, a few catching the light.
            const d = ballImg.data;
            const step = Math.PI / 14, latStep = Math.PI / 15;
            const glintTick = Math.floor(t * 8);
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const i = (y * size + x) * 4;
                    const nx = (x - ball.r) / ball.r, ny = (y - ball.r) / ball.r;
                    const r2 = nx * nx + ny * ny;
                    if (r2 > 1) {
                        d[i + 3] = 0;
                        continue;
                    }
                    const nz = Math.sqrt(1 - r2);
                    const lat = Math.asin(ny) + Math.PI / 2;
                    const lon = Math.atan2(nx, nz) + rot;
                    const fi = Math.floor(lat / latStep);
                    const lonN = ((lon % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                    const fj = Math.floor(lonN / step);
                    const fu = lonN / step - fj;
                    const grout = (lat / latStep - fi) < 0.14 || (fu < 0.12 && nz > 0.35);
                    const h = hash(fi, fj);
                    let v = 0.45 + 0.6 * (nz * 0.5 - nx * 0.25 - ny * 0.35 + 0.2) + (h - 0.5) * 0.35;
                    let col: RGB = [175, 180, 215];
                    if (h > 0.78) col = tiles[Math.floor(h * 100) % 5];
                    if (hash(fi * 7 + fj, glintTick) > 0.94 - 0.05 * kick && nz > 0.3) v = 1.4;
                    if (grout) v *= 0.55;
                    d[i] = Math.min(255, col[0] * v);
                    d[i + 1] = Math.min(255, col[1] * v);
                    d[i + 2] = Math.min(255, col[2] * v);
                    d[i + 3] = 255;
                }
            }
            ballLayer.ctx.putImageData(ballImg, 0, 0);
            ctx.fillStyle = '#8a7aa0';
            ctx.fillRect(ball.x, 0, 1, ball.y - ball.r);
            ctx.drawImage(ballLayer.canvas, ball.x - ball.r, ball.y - ball.r);

            // A sparkle on the ball's edge every other beat.
            if (b % 2 === 0) {
                const a = kick;
                const gx = ball.x - 6 + Math.round(hash(b, 1) * 4), gy = ball.y - 9 + Math.round(hash(b, 2) * 4);
                ctx.fillStyle = css([255, 255, 255], a);
                ctx.fillRect(gx - 2, gy, 5, 1);
                ctx.fillRect(gx, gy - 2, 1, 5);
            }
        };
    }
};
