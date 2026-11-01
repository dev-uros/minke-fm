import {Backdrop, canvas, css, disc, ditherPick, hash, hex, pixels, pulse, RGB, rng, wrappingNoise} from '../pixel';

/**
 * A dark cinema from the back rows: the projector beam cuts through dusty
 * air over rows of seats, the screen cuts between wide landscape shots, and
 * its light washes over the curtains and the tops of the seats.
 */
export const CINEMA: Backdrop = {
    id: 'screen-cinema',
    name: 'Back row',
    bpm: 70,
    create(W, H) {
        const random = rng(29);
        const sw = Math.round(Math.min(W * 0.58, 220));
        const sh = Math.round(sw * 0.43);
        const sx = Math.round(W / 2 - sw / 2), sy = 34;
        const SW = Math.round(sw * 1.25);

        // Each shot is wider than the screen so it can pan slowly. Average colour drives the room light.
        type Shot = {img: HTMLCanvasElement; light: RGB};
        const shot = (light: string, paint: (put: (x: number, y: number, c: RGB) => void, r: () => number) => void): Shot =>
            ({img: pixels(SW, sh, put => paint(put, rng(Math.floor(random() * 1e6)))).canvas, light: hex(light)});
        const gradient = (put: (x: number, y: number, c: RGB) => void, cols: string[], to: number) => {
            const p = cols.map(hex);
            for (let y = 0; y < sh; y++) for (let x = 0; x < SW; x++) put(x, y, ditherPick(p, y / to, x, y));
        };
        const shots: Shot[] = [
            // Desert at sunset.
            shot('#ff9a5a', (put, r) => {
                gradient(put, ['#2a1a4a', '#7a2a5a', '#e8584a', '#ffb060', '#ffe0a0'], sh * 0.62);
                disc(put, Math.round(SW * 0.6), Math.round(sh * 0.55), Math.round(sh * 0.16), () => hex('#fff2c0'));
                for (let layer = 0; layer < 3; layer++) {
                    const col = ['#8a3a3a', '#5a2234', '#2a1024'].map(hex)[layer];
                    const ph = r() * 6;
                    for (let x = 0; x < SW; x++) {
                        const top = Math.round(sh * (0.6 + layer * 0.12) - Math.sin(x * 0.03 + ph) * 4 - Math.sin(x * 0.011 + ph) * 6);
                        for (let y = top; y < sh; y++) put(x, y, col);
                    }
                }
            }),
            // Moonlit sea.
            shot('#6a8aff', (put, r) => {
                gradient(put, ['#040818', '#0a1840', '#1a3270', '#2a4a8a'], sh * 0.55);
                const hz = Math.round(sh * 0.55);
                for (let i = 0; i < 50; i++) put(r() * SW, r() * hz * 0.8, hex('#e0e8ff'));
                const mx = Math.round(SW * 0.45);
                disc(put, mx, Math.round(sh * 0.25), Math.round(sh * 0.1), () => hex('#f0f0ff'));
                for (let y = hz; y < sh; y++)
                    for (let x = 0; x < SW; x++) {
                        const near = Math.abs(x - mx) < 3 + (y - hz) * 0.35 && (x + y * 2) % 3 === 0 && r() < 0.8 - (y - hz) / sh;
                        put(x, y, near ? hex('#c8d8ff') : (y + Math.round(Math.sin(x * 0.2 + y) * 1.5)) % 4 === 0 ? hex('#1a3a7a') : hex('#081a40'));
                    }
            }),
            // A ringed planet over a nebula.
            shot('#b06aff', (put, r) => {
                const n = wrappingNoise(SW, sh, 22, r);
                const neb = ['#05030f', '#1a0a3a', '#4a1a6a', '#a03a8a', '#ff7ab0'].map(hex);
                for (let y = 0; y < sh; y++) for (let x = 0; x < SW; x++) put(x, y, ditherPick(neb, n(x, y) * 1.2 - 0.25, x, y));
                for (let i = 0; i < 80; i++) put(r() * SW, r() * sh, hex('#ffffff'));
                const px = Math.round(SW * 0.62), py = Math.round(sh * 0.55), pr = Math.round(sh * 0.26);
                const body = ['#1a1030', '#4a3a8a', '#8a7ad0', '#d8c8ff'].map(hex);
                disc(put, px, py, pr, (x, y) => ditherPick(body, 1 - Math.hypot(x - px + pr * 0.5, y - py + pr * 0.5) / (pr * 1.7), x, y));
                for (let a = 0; a < Math.PI * 2; a += 0.004) {
                    const x = px + Math.cos(a) * pr * 1.8, y = py + Math.sin(a) * pr * 0.35;
                    if (Math.sin(a) < 0 && Math.hypot(x - px, y - py) < pr) continue;
                    put(x, y, hex('#f0d8a0'));
                    put(x, y + 1, hex('#a08a6a'));
                }
            }),
            // Misty pine forest at dawn.
            shot('#8ac8a0', (put, r) => {
                gradient(put, ['#8ab8c0', '#c8e0d0', '#f0f0d8'], sh * 0.6);
                for (let layer = 0; layer < 4; layer++) {
                    const col = ['#8aa8a0', '#5a8a7a', '#2a5a4a', '#0a2a22'].map(hex)[layer];
                    const base = sh * (0.55 + layer * 0.12);
                    for (let x = 0; x < SW; x += 5 + Math.floor(r() * 6)) {
                        const h = 14 + r() * 18 + layer * 4;
                        for (let y = 0; y < h; y++) {
                            const half = Math.floor(y * 0.28 + (y % 4 === 3 ? 1 : 0));
                            for (let i = -half; i <= half; i++) put(x + i, Math.round(base - h + y), col);
                        }
                        for (let y = Math.round(base); y < sh; y++) put(x, y, col);
                    }
                    for (let y = Math.round(base); y < sh; y++) for (let x = 0; x < SW; x++) put(x, y, col);
                }
            })
        ];
        const shotLength = 7;

        // The room: wall, proscenium, curtains, all lit only by what is on screen.
        const room = pixels(W, H, put => {
            const wall = ['#05030a', '#0c0812', '#140c18'].map(hex);
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) {
                    const d = Math.hypot((x - W / 2) / W, (y - sy - sh / 2) / H);
                    put(x, y, ditherPick(wall, 1 - d * 2.2, x, y));
                }
            // Curtains either side, folds as vertical stripes, and a valance above.
            const red = ['#1a0408', '#3a0a14', '#5a1420', '#7a1e2a'].map(hex);
            for (let y = sy - 10; y < sy + sh + 14; y++) {
                for (let i = 0; i < 26; i++) {
                    const fold = 0.5 + 0.5 * Math.sin(i * 0.9);
                    put(sx - 26 + i, y, ditherPick(red, fold * (0.4 + 0.6 * i / 26), sx - 26 + i, y));
                    put(sx + sw + 25 - i, y, ditherPick(red, fold * (0.4 + 0.6 * i / 26), sx + sw + 25 - i, y));
                }
            }
            for (let y = sy - 12; y < sy - 3; y++)
                for (let x = sx - 26; x < sx + sw + 26; x++)
                    put(x, y, ditherPick(red, 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(x * 0.5)) * (y - sy + 12) / 9, x, y));
            for (let x = sx - 1; x <= sx + sw; x++) { put(x, sy - 1, hex('#000000')); put(x, sy + sh, hex('#000000')); }
            // Stage lip below the screen.
            for (let y = sy + sh + 4; y < sy + sh + 14; y++)
                for (let x = sx - 30; x < sx + sw + 30; x++) put(x, y, y === sy + sh + 4 ? hex('#3a1a1a') : hex('#120808'));
            // Exit light on the left wall and a strip of aisle lights.
            for (let y = 0; y < 3; y++) for (let x = 0; x < 6; x++) put(Math.round(W * 0.06) + x, 40 + y, hex('#3aff8a'));
        });

        // Seats in rows, nearest at the bottom, some with someone in them.
        type Seat = {x: number; y: number; w: number; head: boolean};
        const seats: Seat[] = [];
        const rows = [{y: 124, w: 11}, {y: 136, w: 14}, {y: 151, w: 18}, {y: 168, w: 24}];
        rows.forEach((row, ri) => {
            const offset = (ri % 2) * row.w / 2 - random() * 4;
            for (let x = offset - row.w; x < W + row.w; x += row.w + 1) {
                if (Math.abs(x + row.w / 2 - W * 0.5) < row.w * 0.6 && ri > 0) continue;
                seats.push({x: Math.round(x), y: row.y, w: row.w, head: random() < 0.3});
            }
        });
        const seatLayer = canvas(W, H);
        {
            const c = seatLayer.ctx;
            for (const s of seats) {
                c.fillStyle = '#030205';
                if (s.head) {
                    const hr = Math.max(2, Math.round(s.w * 0.26));
                    const hx = s.x + Math.round(s.w / 2);
                    for (let dy = -hr; dy <= hr; dy++) {
                        const half = Math.floor(Math.sqrt(hr * hr - dy * dy + hr * 0.6));
                        c.fillRect(hx - half, s.y - hr * 2 - 2 + dy, half * 2 + 1, 1);
                    }
                    c.fillRect(hx - hr - 1, s.y - hr - 1, hr * 2 + 3, hr + 1);
                }
                // Seat back with rounded shoulders and a dark seam to the next seat.
                c.fillStyle = '#100a14';
                c.fillRect(s.x + 2, s.y, s.w - 4, 1);
                c.fillRect(s.x + 1, s.y + 1, s.w - 2, 1);
                c.fillRect(s.x, s.y + 2, s.w, H - s.y);
                c.fillStyle = '#18101c';
                c.fillRect(s.x + 2, s.y + 2, s.w - 4, 2);
                c.fillStyle = '#000000';
                c.fillRect(s.x + s.w, s.y, 1, H - s.y);
            }
        }

        // The beam: a soft wedge from above our heads to the screen.
        const beamMask = pixels(W, H, put => {
            const apexY = -40, apexL = W / 2 - W * 0.12, apexR = W / 2 + W * 0.12;
            for (let y = 0; y < sy + sh; y++) {
                const f = (y - apexY) / (sy + sh * 0.5 - apexY);
                const l = apexL + (sx - apexL) * f, r = apexR + (sx + sw - apexR) * f;
                for (let x = Math.floor(l); x <= r; x++) {
                    const edge = Math.min(x - l, r - x) / 8;
                    put(x, y, hex('#ffffff'), Math.round(255 * Math.min(1, edge) * Math.max(0, 1 - f * 0.75)));
                }
            }
        });
        const noise = wrappingNoise(W, H, 16, random);
        // Twice as wide as the screen so one draw always covers it (destination-in clears outside the image).
        const smoke = pixels(W * 2, H, put => {
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W * 2; x++) put(x, y, hex('#ffffff'), Math.round(255 * Math.max(0.1, noise(x % W, y) * 1.3 - 0.2)));
        });
        const temp = canvas(W, H);
        const motes = Array.from({length: 60}, () => ({x: random() * W, y: random() * (sy + sh), v: 1 + random() * 3, p: random() * 6}));

        return (ctx, t, beat) => {
            const kick = pulse(beat);
            const n = Math.floor(t / shotLength);
            const s = shots[n % shots.length];
            const prog = (t % shotLength) / shotLength;
            const flicker = 0.92 + 0.08 * hash(Math.floor(t * 24), 1);
            const level = flicker * (0.85 + 0.15 * kick);

            ctx.drawImage(room.canvas, 0, 0);

            // Screen light spilling over the room.
            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(W / 2, sy + sh / 2, sw * 0.3, W / 2, sy + sh / 2, W * 0.75);
            g.addColorStop(0, css(s.light, 0.16 * level));
            g.addColorStop(1, css(s.light, 0));
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = 'source-over';

            // The picture, panning, with a flash on each cut.
            const pan = Math.round((n % 2 ? prog : 1 - prog) * (SW - sw));
            ctx.drawImage(s.img, pan, 0, sw, sh, sx, sy, sw, sh);
            ctx.fillStyle = `rgba(0,0,0,${(1 - level).toFixed(3)})`;
            ctx.fillRect(sx, sy, sw, sh);
            if (t % shotLength < 0.12) {
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.fillRect(sx, sy, sw, sh);
            }
            // Film grain and the odd scratch.
            for (let i = 0; i < 14; i++) {
                const gx = sx + Math.floor(hash(i, Math.floor(t * 24)) * sw), gy = sy + Math.floor(hash(Math.floor(t * 24), i) * sh);
                ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
                ctx.fillRect(gx, gy, 1, 1);
            }
            if (hash(Math.floor(t * 6), 4) < 0.15) {
                ctx.fillStyle = 'rgba(255,255,255,0.18)';
                ctx.fillRect(sx + Math.floor(hash(Math.floor(t * 6), 5) * sw), sy, 1, sh);
            }

            // Beam with drifting smoke, tinted by the picture.
            const tc = temp.ctx;
            tc.globalCompositeOperation = 'copy';
            tc.drawImage(beamMask.canvas, 0, 0);
            tc.globalCompositeOperation = 'destination-in';
            const drift = Math.floor(t * 2) % W;
            tc.drawImage(smoke.canvas, -drift, 0);
            tc.globalCompositeOperation = 'source-atop';
            tc.fillStyle = css(s.light.map(v => Math.min(255, v * 0.6 + 100)) as RGB, 1);
            tc.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.6 * level;
            ctx.drawImage(temp.canvas, 0, 0);
            ctx.globalAlpha = 1;

            // Dust motes catch the light only inside the beam.
            for (const m of motes) {
                const y = (m.y + t * m.v * 0.5) % (sy + sh);
                const x = m.x + Math.sin(t * 0.4 + m.p) * 6;
                const f = (y + 40) / (sy + sh * 0.5 + 40);
                const l = W / 2 - W * 0.12 + (sx - W / 2 + W * 0.12) * f, r = W / 2 + W * 0.12 + (sx + sw - W / 2 - W * 0.12) * f;
                if (x < l + 3 || x > r - 3 || y >= sy - 2) continue;
                const tw = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * 3 + m.p * 7));
                ctx.fillStyle = css([255, 240, 220], tw * level);
                ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
            }
            ctx.globalCompositeOperation = 'source-over';

            // Seats and heads, with a rim of screen light along their tops.
            ctx.drawImage(seatLayer.canvas, 0, 0);
            for (const seat of seats) {
                const a = (0.25 + 0.2 * (seat.y - 120) / 50) * level;
                ctx.fillStyle = css(s.light, a);
                ctx.fillRect(seat.x + 2, seat.y, seat.w - 4, 1);
                if (seat.head) {
                    const hr = Math.max(2, Math.round(seat.w * 0.26));
                    ctx.fillRect(seat.x + Math.round(seat.w / 2) - hr + 1, seat.y - hr * 3 - 2, hr * 2 - 1, 1);
                }
            }
            // Aisle step lights.
            ctx.fillStyle = '#ffb347';
            for (const y of [130, 143, 159, 176]) {
                ctx.fillRect(Math.round(W / 2) - 1, y, 2, 1);
            }
        };
    }
};
