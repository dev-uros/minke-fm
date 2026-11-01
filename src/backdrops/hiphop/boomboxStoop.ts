import {Backdrop, bayer, css, ditherPick, hash, hex, pixels, pulse, RGB, rng} from '../pixel';
import {graffitiPiece, SPRAYS} from './graffiti';
import {fillDisc} from './draw';

/**
 * A city block at night: a brick wall thick with abstract graffiti, a stoop
 * with a boombox whose speaker cones pump on the beat, a streetlight that
 * stutters now and then, and steam drifting off a manhole.
 */
export const BOOMBOX_STOOP: Backdrop = {
    id: 'hiphop-stoop',
    name: 'Boombox stoop',
    bpm: 90,
    create(W, H) {
        const random = rng(41);
        const ground = Math.round(H * 0.8);
        const curb = ground + 18;
        const wallTop = 20;
        const doorCx = Math.round(W * 0.56);
        const door = {x: doorCx - 13, y: 64, w: 26};
        const stoopTop = ground - 20;
        const pole = Math.round(W * 0.15);
        const head = {x: pole + 12, y: 30};

        // Everything static is painted as flat colour first, then lit twice:
        // once with the streetlight on and once with it off.
        const albedo: Array<RGB | null> = new Array(W * H).fill(null);
        const emissive = new Uint8Array(W * H);
        const put = (x: number, y: number, c: RGB, glow = false) => {
            x = Math.round(x);
            y = Math.round(y);
            if (x < 0 || y < 0 || x >= W || y >= H) return;
            albedo[y * W + x] = c;
            emissive[y * W + x] = glow ? 1 : 0;
        };
        const rect = (x: number, y: number, w: number, h: number, c: RGB, glow = false) => {
            for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c, glow);
        };

        const sky = ['#05051a', '#0c0d2a', '#171634'].map(hex);
        for (let y = 0; y < wallTop; y++)
            for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, y / wallTop, x, y), true);
        for (let i = 0; i < 25; i++) put(random() * W, random() * (wallTop - 6), hex('#9aa0d0'), true);

        // Brick wall.
        const bricks = ['#5a2a24', '#6b3128', '#4e2420', '#62302a', '#57302c'].map(hex);
        const mortar = hex('#2a1c1e');
        for (let y = wallTop; y < ground; y++) {
            const row = Math.floor((y - wallTop) / 4);
            const off = row % 2 ? 4 : 0;
            for (let x = 0; x < W; x++) {
                if ((y - wallTop) % 4 === 3 || (x + off) % 8 === 7) { put(x, y, mortar); continue; }
                const b = bricks[Math.floor(hash(Math.floor((x + off) / 8), row) * bricks.length)];
                put(x, y, hash(x, y) < 0.07 ? [b[0] * 0.8, b[1] * 0.8, b[2] * 0.8] : b);
            }
        }
        rect(0, wallTop - 3, W, 3, hex('#3a3440'));
        for (let x = 0; x < W; x += 4) rect(x, wallTop, 2, 2, hex('#2c2732'));

        // Graffiti on either side of the door, skipping the lamp post.
        const regions = [[4, door.x - 18], [door.x + door.w + 18, W - 4]];
        let spray = Math.floor(random() * SPRAYS.length);
        for (const [from, to] of regions) {
            let x = from + Math.floor(random() * 6);
            while (to - x > 34) {
                const w = Math.min(to - x - 4, 38 + Math.floor(random() * 26));
                const h = 22 + Math.floor(random() * 12);
                const y = 76 + Math.floor(random() * 24);
                graffitiPiece((px, py, c) => { if (py < ground - 1) put(px, py, c); }, x, y, w, h, random, SPRAYS[spray++ % SPRAYS.length]);
                x += w + 10 + Math.floor(random() * 10);
            }
        }
        // A few looping scribbles higher up, single colour.
        for (let k = 0; k < Math.round(W / 70); k++) {
            const c = SPRAYS[Math.floor(random() * SPRAYS.length)].a;
            let x = 8 + random() * (W - 16), y = 58 + random() * 10, a = random() * 6;
            if (Math.abs(x - doorCx) < 30) continue;
            for (let i = 0; i < 40; i++) {
                a += (random() - 0.5) * 1.2;
                x += Math.cos(a) * 0.9 + 0.35;
                y += Math.sin(a) * 0.9;
                put(x, y, c);
            }
        }

        // Upstairs windows.
        const windows = [doorCx - 52, doorCx + 38].filter(x => x > 6 && x < W - 20);
        for (const wx of windows) {
            rect(wx - 2, 28, 18, 2, hex('#6d6158'));
            rect(wx - 1, 48, 16, 2, hex('#6d6158'));
            for (let y = 30; y < 48; y++)
                for (let x = wx; x < wx + 14; x++)
                    put(x, y, (y - 30) % 3 === 2 ? hex('#7a4a2a') : ditherPick([hex('#ffcf7a'), hex('#f2a24a')], (y - 30) / 18, x, y), true);
            rect(wx + 6, 30, 2, 18, hex('#2a1c1c'));
        }

        // Door with a lit transom.
        rect(door.x - 4, door.y - 11, door.w + 8, stoopTop - door.y + 11, hex('#6d6158'));
        rect(door.x, door.y - 8, door.w, 5, hex('#ffc66b'), true);
        for (let x = door.x + 4; x < door.x + door.w; x += 5) rect(x, door.y - 8, 1, 5, hex('#3a2a20'));
        rect(door.x, door.y, door.w, stoopTop - door.y, hex('#2a1712'));
        for (const [px, pw] of [[door.x + 3, 8], [door.x + 15, 8]]) {
            rect(px, door.y + 4, pw, 22, hex('#3a2219'));
            rect(px, door.y + 32, pw, 20, hex('#3a2219'));
        }
        rect(door.x + door.w - 5, door.y + 30, 2, 2, hex('#c9a45a'));

        // Stoop and iron railings.
        const stone = hex('#6a6270'), tread = hex('#9a92a0'), riser = hex('#4a4450');
        [[40, 0], [48, 5], [56, 10], [64, 15]].forEach(([w, dy]) => {
            rect(doorCx - w / 2, stoopTop + dy, w, 5, stone);
            rect(doorCx - w / 2, stoopTop + dy, w, 1, tread);
            rect(doorCx - w / 2, stoopTop + dy + 4, w, 1, riser);
        });
        const iron = hex('#121016');
        for (const side of [-1, 1]) {
            const top = doorCx + side * 22, bottom = doorCx + side * 34;
            for (let i = 0; i <= 12; i++) {
                const x = Math.round(top + (bottom - top) * i / 12);
                const y = stoopTop - 12 + Math.round(i * 1.5);
                put(x, y, iron);
                if (i % 3 === 0) rect(x, y, 1, ground - y, iron);
            }
            rect(top, stoopTop - 14, 1, 14, iron);
        }

        // Sidewalk, curb, street, manhole.
        for (let y = ground; y < curb; y++)
            for (let x = 0; x < W; x++) put(x, y, (x + 7) % 24 === 0 || y === ground ? hex('#2c2a34') : hex('#45434f'));
        rect(0, curb, W, 2, hex('#6a6876'));
        for (let y = curb + 2; y < H; y++)
            for (let x = 0; x < W; x++) put(x, y, hash(x, y) < 0.06 ? hex('#22212e') : hex('#15141f'));
        const manhole = {x: Math.round(W * 0.84), y: H - 7};
        for (let y = -2; y <= 2; y++)
            for (let x = -8; x <= 8; x++)
                if ((x / 8.5) ** 2 + (y / 2.5) ** 2 <= 1) put(manhole.x + x, manhole.y + y, (x + y) % 3 ? hex('#0c0b12') : hex('#2a2834'));

        // Streetlight.
        rect(pole, head.y, 2, ground + 6 - head.y, hex('#1b1a22'));
        rect(pole - 1, ground + 2, 4, 4, hex('#1b1a22'));
        rect(pole, head.y - 1, 12, 2, hex('#1b1a22'));
        rect(head.x - 4, head.y - 3, 9, 3, hex('#26242e'));
        rect(head.x - 2, head.y, 5, 1, hex('#ffe9b0'), true);

        const lightAt = (x: number, y: number, lamp: boolean): [number, number, number] => {
            const t: [number, number, number] = [0.3, 0.31, 0.46];
            if (lamp) {
                const d = Math.max(0, 1 - Math.hypot(x - head.x, (y - head.y) * 0.85) / (H * 0.8));
                const f = Math.pow(d, 1.6) * 1.35;
                t[0] += f; t[1] += f * 0.82; t[2] += f * 0.55;
            }
            const g = Math.pow(Math.max(0, 1 - Math.hypot(x - doorCx, (y - door.y + 6) * 1.2) / 42), 2) * 0.9;
            t[0] += g; t[1] += g * 0.7; t[2] += g * 0.4;
            return t;
        };
        const bake = (lamp: boolean) => pixels(W, H, p => {
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const c = albedo[y * W + x];
                    if (!c) continue;
                    if (emissive[y * W + x]) { p(x, y, c); continue; }
                    const l = lightAt(x, y, lamp), d = bayer(x, y);
                    p(x, y, [0, 1, 2].map(i => Math.min(255, c[i] * Math.floor(l[i] * 6 + d) / 6)) as RGB);
                }
            }
        });
        const dark = bake(false), lit = bake(true);

        // The cone under the lamp, dithered so it stays crisp.
        const cone = pixels(W, H, p => {
            const warm = hex('#ffd890');
            for (let y = head.y + 1; y < H; y++) {
                const f = (y - head.y) / (H - head.y);
                const half = 3 + f * 40;
                for (let x = Math.floor(head.x - half); x <= head.x + half; x++) {
                    const edge = 1 - Math.abs(x - head.x) / half;
                    if (edge * (1 - f * 0.6) > bayer(x, y) * 1.3) p(x, y, warm, 255);
                }
            }
        });

        const lampLevel = (t: number) => {
            const cycle = t % 13;
            if (cycle > 9 && cycle < 10.6) return hash(Math.floor(t * 14), 3) < 0.55 ? 0.12 : 1;
            return 1;
        };

        const box = {w: 52, h: 26};
        const bx = doorCx - box.w / 2, by = stoopTop + 5 - box.h + 1;
        const speakers = [bx + 12, bx + box.w - 12];
        const sy = by + 15;
        const moths = [0, 1, 2].map(i => ({phase: i * 2.1, r: 4 + i * 2}));

        return (ctx, t, beat) => {
            const kick = pulse(beat);
            const level = lampLevel(t);

            ctx.drawImage(dark.canvas, 0, 0);
            ctx.globalAlpha = level;
            ctx.drawImage(lit.canvas, 0, 0);
            ctx.globalAlpha = 0.11 * level;
            ctx.drawImage(cone.canvas, 0, 0);
            ctx.globalAlpha = 1;
            if (level > 0.5) {
                ctx.fillStyle = 'rgba(255,240,200,0.9)';
                ctx.fillRect(head.x - 2, head.y, 5, 1);
                ctx.fillStyle = 'rgba(255,220,150,0.25)';
                ctx.fillRect(head.x - 4, head.y - 1, 9, 3);
                ctx.fillStyle = '#e8dcc0';
                for (const m of moths) {
                    const a = t * 3 + m.phase;
                    ctx.fillRect(Math.round(head.x + Math.cos(a) * m.r), Math.round(head.y + 4 + Math.sin(a * 1.7) * 3), 1, 1);
                }
            }

            // A TV flickers blue behind one of the windows.
            if (windows.length > 1) {
                const f = hash(Math.floor(t * 5), 9);
                ctx.fillStyle = `rgba(110,160,255,${(0.25 + f * 0.35).toFixed(3)})`;
                ctx.fillRect(windows[1], 30, 14, 18);
            }

            // Every so often a car's headlights sweep across the wall.
            const sweep = (t % 17) / 2.6;
            if (sweep < 1) {
                const x = -60 + sweep * (W + 120);
                const g = ctx.createLinearGradient(x - 30, 0, x + 30, 0);
                g.addColorStop(0, 'rgba(255,240,210,0)');
                g.addColorStop(0.5, 'rgba(255,240,210,0.09)');
                g.addColorStop(1, 'rgba(255,240,210,0)');
                ctx.fillStyle = g;
                ctx.fillRect(x - 30, wallTop, 60, ground - wallTop);
            }

            // Boombox.
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(bx - 2, stoopTop + 6, box.w + 4, 2);
            ctx.fillStyle = '#1b1a22';
            ctx.fillRect(bx + 8, by - 6, 2, 6);
            ctx.fillRect(bx + box.w - 10, by - 6, 2, 6);
            ctx.fillRect(bx + 8, by - 7, box.w - 16, 2);
            ctx.fillStyle = '#8c8a99';
            ctx.fillRect(bx + 10, by - 7, box.w - 20, 1);
            ctx.fillStyle = '#2b2a33';
            ctx.fillRect(bx, by, box.w, box.h);
            ctx.fillStyle = '#4a4855';
            ctx.fillRect(bx, by, box.w, 1);
            ctx.fillRect(bx, by, 1, box.h);
            ctx.fillStyle = '#17161c';
            ctx.fillRect(bx, by + box.h - 1, box.w, 1);
            // Tuner strip.
            ctx.fillStyle = '#3a2a14';
            ctx.fillRect(bx + 20, by + 3, 12, 3);
            ctx.fillStyle = '#ffb347';
            ctx.fillRect(bx + 21, by + 4, 10, 1);
            ctx.fillStyle = '#ff4f4f';
            ctx.fillRect(bx + 25 + Math.round(Math.sin(t * 0.3) * 3), by + 3, 1, 3);
            // Tape window with turning reels.
            ctx.fillStyle = '#0c0b10';
            ctx.fillRect(bx + 20, by + 8, 12, 7);
            for (const rx of [bx + 23, bx + 29]) {
                ctx.fillStyle = '#6b6977';
                ctx.fillRect(rx - 1, by + 10, 3, 3);
                ctx.fillStyle = '#0c0b10';
                const a = t * 4;
                ctx.fillRect(rx + Math.round(Math.cos(a)), by + 11 + Math.round(Math.sin(a)), 1, 1);
            }
            // EQ bars.
            for (let i = 0; i < 6; i++) {
                const v = 0.3 + 0.7 * kick * (0.6 + 0.4 * Math.sin(i * 1.7 + beat * 2)) + 0.15 * Math.sin(t * 7 + i);
                const h = Math.max(1, Math.min(5, Math.round(v * 5)));
                for (let j = 0; j < h; j++) {
                    ctx.fillStyle = j > 3 ? '#ff4f6a' : j > 2 ? '#ffd24a' : '#3fe0a0';
                    ctx.fillRect(bx + 20 + i * 2, by + 23 - j, 1, 1);
                }
            }
            // Speakers: grille ring, cone that pushes out on the kick, dust cap.
            const push = kick > 0.45 ? 1 : 0;
            for (const cx of speakers) {
                ctx.fillStyle = '#6b6977';
                fillDisc(ctx, cx, sy, 9);
                ctx.fillStyle = '#121117';
                fillDisc(ctx, cx, sy, 8);
                ctx.fillStyle = push ? '#34323e' : '#22212a';
                fillDisc(ctx, cx, sy, 6 + push);
                ctx.fillStyle = '#121117';
                fillDisc(ctx, cx, sy, 4);
                ctx.fillStyle = push ? '#c9c7d6' : '#8c8a99';
                fillDisc(ctx, cx, sy, 1 + push);
            }

            // Sound rings ripple outwards from each speaker.
            for (let k = 0; k < 3; k++) {
                const ph = (beat + k / 3) % 1;
                const r = 13 + ph * 18;
                ctx.fillStyle = `rgba(255,220,170,${(0.45 * (1 - ph)).toFixed(3)})`;
                for (let a = -0.7; a <= 0.7; a += 0.1) {
                    const dy = Math.round(Math.sin(a) * r);
                    ctx.fillRect(Math.round(speakers[0] - Math.cos(a) * r), sy + dy, 1, 1);
                    ctx.fillRect(Math.round(speakers[1] + Math.cos(a) * r), sy + dy, 1, 1);
                }
            }

            // Steam from the manhole.
            for (let k = 0; k < 26; k++) {
                const age = (t * 0.35 + k / 26) % 1;
                const x = manhole.x + Math.round(Math.sin(k * 3.1 + t * 0.9 + age * 4) * (2 + age * 8));
                const y = Math.round(manhole.y - 1 - age * 40);
                ctx.fillStyle = css([190, 190, 215], 0.28 * (1 - age));
                ctx.fillRect(x, y, 2, 1);
            }
        };
    }
};
