import {Backdrop, canvas, css, ditherPick, hash, hex, pixels, pulse, RGB, rng} from '../pixel';

/** Pixels along a straight line, for neon tubes. */
function line(x0: number, y0: number, x1: number, y1: number): Array<[number, number]> {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    return Array.from({length: n + 1}, (_, i) => [Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n)]);
}

/**
 * A jazz bar on a rainy night, seen from across the street: a neon cocktail
 * glass and a pair of notes buzz over a glowing doorway, a street lamp hisses
 * with rain, and everything shivers upside down in the wet cobblestones.
 */
export const RAINY_STREET: Backdrop = {
    id: 'jazz-rainy-street',
    name: 'Rain on the bar',
    bpm: 76,
    create(W, H) {
        const random = rng(57);
        const cx = Math.round(W / 2);
        const walk = 112, curb = 120, street = 123;
        const door = {x0: cx - 9, x1: cx + 9, y0: 76};
        const lamp = {x: cx + Math.round(W * 0.3), y: 30};

        const brick = ['#060409', '#0f0810', '#1b0e17', '#2a141d', '#3d1c22', '#57292a', '#7a3c30'].map(hex);
        const inside = ['#2a1006', '#5a2a0c', '#99501a', '#d88a32', '#ffc56a'].map(hex);
        const slab = ['#07080d', '#10131c', '#1b2030', '#2a3146', '#3e4862'].map(hex);
        const glassBlue = ['#05060c', '#0b0f1e', '#141c34'].map(hex);

        // Warm light leaking from the door and windows onto the wall.
        const glowAt = (x: number, y: number) => {
            const d = Math.hypot((x - cx) / 1.2, (y - 90) * 1.1);
            return Math.max(0, 1 - d / 70);
        };

        const facade = pixels(W, curb + 3, put => {
            for (let y = 0; y < walk; y++) {
                const row = Math.floor(y / 4);
                for (let x = 0; x < W; x++) {
                    const col = Math.floor((x + (row % 2) * 4) / 8);
                    const mortar = y % 4 === 3 || (x + (row % 2) * 4) % 8 === 7;
                    const v = 0.12 + glowAt(x, y) * 0.55 + (mortar ? -0.1 : hash(row, col) * 0.12) - (1 - y / walk) * 0.08;
                    put(x, y, ditherPick(brick, v, x, y));
                }
            }
            // Upper windows, mostly dark, one with a lamp behind a curtain.
            const upper = Math.max(3, Math.floor(W / 70));
            for (let i = 0; i < upper; i++) {
                const wx = Math.round(((i + 0.5) / upper) * W) - 7;
                const lit = i === Math.floor(upper / 2) - 1;
                for (let y = 14; y < 34; y++) {
                    for (let x = wx; x < wx + 14; x++) {
                        const frame = x === wx || x === wx + 13 || y === 14 || y === 33 || x === wx + 6 || y === 23;
                        if (frame) put(x, y, brick[0]);
                        else if (lit) put(x, y, ditherPick(inside, 0.5 + (y - 14) / 50 - Math.abs(x - wx - 7) / 20, x, y));
                        else put(x, y, ditherPick(glassBlue, (y - 14) / 30 + (x - wx === y - 14 ? 0.6 : 0), x, y));
                    }
                }
                for (let x = wx - 1; x < wx + 15; x++) put(x, 34, brick[4]);
            }
            // Ground-floor windows with blinds.
            for (const side of [-1, 1]) {
                const wx0 = side < 0 ? cx - 46 : cx + 20, wx1 = wx0 + 26;
                for (let y = 82; y < 104; y++) {
                    for (let x = wx0; x < wx1; x++) {
                        const edge = x === wx0 || x === wx1 - 1 || y === 82 || y === 103;
                        if (edge) put(x, y, brick[0]);
                        else put(x, y, ditherPick(inside, (y % 3 === 0 ? 0.05 : 0.3) + (y - 82) / 70 - Math.abs(x - (wx0 + wx1) / 2) / 60, x, y));
                    }
                }
                for (let x = wx0 - 1; x <= wx1; x++) put(x, 104, brick[5]);
            }
            // The doorway: warm inside, the door swung open to one side.
            for (let y = door.y0; y < walk; y++) {
                for (let x = door.x0 - 2; x <= door.x1 + 2; x++) {
                    if (x < door.x0 || x > door.x1 || y < door.y0 + 2) put(x, y, brick[0]);
                    else if (x > door.x1 - 5 + Math.floor((y - door.y0) / 18)) put(x, y, ditherPick(brick, 0.25, x, y));
                    else put(x, y, ditherPick(inside, 0.85 - (walk - y) / 55 - Math.abs(x - cx + 2) / 30, x, y));
                }
            }
            // Awning over the door.
            for (let y = 66; y < 74; y++) {
                const spread = 18 + (y - 66);
                for (let x = cx - spread; x <= cx + spread; x++) {
                    const stripe = Math.floor((x - cx + 40) / 3) % 2 === 0;
                    put(x, y, hex(stripe ? (y === 66 ? '#6a1a2a' : '#4a1020') : (y === 66 ? '#2a2a34' : '#16161e')));
                }
            }
            for (let x = cx - 26; x <= cx + 26; x++) if (Math.floor((x - cx + 40) / 3) % 2 === 0) put(x, 74, hex('#3a0c18'));
            // Sign backing plate and brackets.
            for (let y = 39; y < 63; y++) for (let x = cx - 24; x <= cx + 22; x++) put(x, y, ditherPick(brick, 0.02, x, y));
            // Drainpipe.
            const pipe = cx - Math.round(W * 0.36);
            for (let y = 0; y < walk; y++) {
                put(pipe, y, hex('#1c1f2a'));
                put(pipe + 1, y, hex('#2c3142'));
                if (y % 22 === 0) for (let x = pipe - 1; x <= pipe + 2; x++) put(x, y, hex('#0c0d14'));
            }
            // Wet pavement and the curb.
            for (let y = walk; y < curb + 3; y++) {
                for (let x = 0; x < W; x++) {
                    let v = 0.25 + glowAt(x, y - 20) * 0.5;
                    if (y === walk) v = 0.05;
                    if (y >= curb) v = y === curb ? 0.75 : 0.12;
                    if ((x + (y - walk) * 3) % 26 === 0 && y < curb) v -= 0.15;
                    put(x, y, ditherPick(slab, v, x, y));
                }
            }
            // The lamp post.
            for (let y = lamp.y; y < curb; y++) {
                put(lamp.x + 8, y, hex('#0c0d12'));
                put(lamp.x + 9, y, hex('#1d2130'));
            }
            for (let x = lamp.x + 6; x <= lamp.x + 11; x++) for (let y = curb - 4; y < curb; y++) put(x, y, hex('#0c0d12'));
            for (let x = lamp.x; x <= lamp.x + 9; x++) put(x, lamp.y - Math.round(Math.sin(((x - lamp.x) / 9) * Math.PI) * 2), hex('#0c0d12'));
            for (let x = lamp.x - 3; x <= lamp.x + 3; x++) {
                put(x, lamp.y, hex('#0c0d12'));
                put(x, lamp.y + 1, hex('#1d2130'));
            }
        });

        // Neon: a pink cocktail glass and two cyan notes.
        const glassTube = [
            ...line(cx - 19, 44, cx - 5, 44), ...line(cx - 19, 44, cx - 12, 52), ...line(cx - 5, 44, cx - 12, 52),
            ...line(cx - 12, 52, cx - 12, 58), ...line(cx - 16, 59, cx - 8, 59), ...line(cx - 8, 44, cx - 4, 40)
        ];
        const noteTube = [
            ...line(cx + 6, 57, cx + 8, 57), ...line(cx + 5, 58, cx + 7, 58),
            ...line(cx + 15, 55, cx + 17, 55), ...line(cx + 14, 56, cx + 16, 56),
            ...line(cx + 8, 57, cx + 8, 44), ...line(cx + 17, 55, cx + 17, 42),
            ...line(cx + 8, 44, cx + 17, 42), ...line(cx + 8, 45, cx + 17, 43)
        ];
        const pink = hex('#ff5aa8'), cyan = hex('#6ff3ff');

        const above = canvas(W, curb + 3);

        // Cobblestones: dark gaps over the reflection, with smooth puddles.
        const puddles = [
            {x: cx - Math.round(W * 0.22), y: 140, rx: 26, ry: 5},
            {x: cx + 6, y: 156, rx: 34, ry: 7},
            {x: cx + Math.round(W * 0.3), y: 168, rx: 22, ry: 5}
        ];
        const inPuddle = (x: number, y: number) =>
            puddles.some(p => ((x - p.x) / p.rx) ** 2 + ((y - p.y) / p.ry) ** 2 < 1);
        const stones = pixels(W, H, put => {
            const dark = hex('#030306');
            const face = hex('#0a0c14');
            let y = street, k = 0;
            while (y < H) {
                const h = 3 + Math.floor(k * 0.6);
                const w = h * 2 + 1;
                const shift = Math.floor(random() * w);
                for (let yy = y; yy < Math.min(H, y + h); yy++) {
                    for (let x = 0; x < W; x++) {
                        if (inPuddle(x, yy)) continue;
                        const gap = yy === y || (x + shift) % w === 0;
                        if (gap) put(x, yy, dark, 235);
                        else put(x, yy, face, yy === y + 1 ? 40 : 110);
                    }
                }
                y += h;
                k++;
            }
        });

        const drops = Array.from({length: 170}, () => ({
            x: random() * W, y: random() * H, speed: 150 + random() * 80, len: 3 + Math.floor(random() * 4)
        }));
        const rings: Array<{x: number, y: number, age: number, size: number}> = [];
        const rain: RGB = hex('#8fa3cc');
        const lampLight: RGB = hex('#ffd59a');
        const inLamp = (x: number, y: number) => {
            if (y < lamp.y || y > curb) return false;
            return Math.abs(x - lamp.x) < 3 + (y - lamp.y) * 0.32;
        };
        let last = 0;

        const drawNeon = (c: CanvasRenderingContext2D, tube: Array<[number, number]>, colour: RGB, on: number, breath: number) => {
            if (on <= 0) return;
            const xs = tube.map(p => p[0]), ys = tube.map(p => p[1]);
            const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2;
            c.globalCompositeOperation = 'lighter';
            const g = c.createRadialGradient(mx, my, 1, mx, my, 26);
            g.addColorStop(0, css(colour, (0.32 + 0.1 * breath) * on));
            g.addColorStop(1, css(colour, 0));
            c.fillStyle = g;
            c.fillRect(mx - 30, my - 30, 60, 60);
            c.globalCompositeOperation = 'source-over';
            c.fillStyle = css(colour, on);
            for (const [x, y] of tube) c.fillRect(x, y, 1, 1);
            c.fillStyle = `rgba(255,255,255,${(0.55 * on).toFixed(3)})`;
            for (let i = 0; i < tube.length; i += 2) c.fillRect(tube[i][0], tube[i][1], 1, 1);
        };

        return (ctx, t, beat) => {
            const dt = Math.min(0.1, t - last);
            last = t;
            const breath = pulse(beat);

            // The glass sign buzzes: now and then it stutters for half a second.
            const stutter = (t % 13) < 0.7;
            const glassOn = stutter ? (hash(Math.floor(t * 22), 3) > 0.45 ? 1 : 0.15) : 0.92 + hash(Math.floor(t * 30), 1) * 0.08;
            const noteOn = 0.9 + hash(Math.floor(t * 25), 2) * 0.1;

            const a = above.ctx;
            a.clearRect(0, 0, W, curb + 3);
            a.drawImage(facade.canvas, 0, 0);
            drawNeon(a, glassTube, pink, glassOn, breath);
            drawNeon(a, noteTube, cyan, noteOn, breath);
            // Lamp cone and pool.
            a.globalCompositeOperation = 'lighter';
            const cone = a.createLinearGradient(0, lamp.y, 0, curb);
            cone.addColorStop(0, css(lampLight, 0.28));
            cone.addColorStop(1, css(lampLight, 0.06));
            a.fillStyle = cone;
            a.beginPath();
            a.moveTo(lamp.x - 3, lamp.y + 2);
            a.lineTo(lamp.x + 3, lamp.y + 2);
            a.lineTo(lamp.x + 3 + (curb - lamp.y) * 0.32, curb);
            a.lineTo(lamp.x - 3 - (curb - lamp.y) * 0.32, curb);
            a.fill();
            a.fillStyle = css(lampLight, 0.95);
            a.fillRect(lamp.x - 2, lamp.y + 2, 5, 1);
            a.globalCompositeOperation = 'source-over';

            ctx.fillStyle = '#05060b';
            ctx.fillRect(0, 0, W, H);
            ctx.drawImage(above.canvas, 0, 0);

            // Reflection: the street mirrors the facade, rippling, compressed towards the top.
            ctx.globalAlpha = 0.62;
            for (let y = street; y < H; y++) {
                const src = Math.round(walk - (y - street) * 1.4);
                if (src < 0) break;
                const wob = Math.round(Math.sin(y * 0.9 + t * 3.5) * (0.6 + (y - street) * 0.05));
                ctx.drawImage(above.canvas, 0, src, W, 1, wob, y, W, 1);
            }
            ctx.globalAlpha = 1;
            ctx.drawImage(stones.canvas, 0, 0);

            // Rain, warmer where it falls through the lamp light.
            for (const d of drops) {
                d.y += d.speed * dt;
                d.x -= d.speed * dt * 0.12;
                if (d.y > H) {
                    d.y = -random() * 20;
                    d.x = random() * (W + 20);
                }
                const lit = inLamp(d.x, d.y);
                ctx.fillStyle = lit ? css(lampLight, 0.75) : css(rain, 0.3);
                for (let k = 0; k < d.len; k++) ctx.fillRect(Math.round(d.x + k * 0.12), Math.round(d.y - k), 1, 1);
            }

            // Splashes on the ground, and rings in the puddles.
            ctx.fillStyle = css(rain, 0.55);
            for (let i = 0; i < 14; i++) {
                const slot = Math.floor(t * 12);
                const sx = Math.floor(hash(slot, i) * W), sy = walk + Math.floor(hash(i, slot) * (H - walk));
                ctx.fillRect(sx, sy, 1, 1);
                if (i % 3 === 0) ctx.fillRect(sx - 1, sy, 3, 1);
            }
            if (random() < dt * 6) {
                const p = puddles[Math.floor(random() * puddles.length)];
                const ang = random() * Math.PI * 2, r = Math.sqrt(random()) * 0.7;
                rings.push({x: p.x + Math.cos(ang) * p.rx * r, y: p.y + Math.sin(ang) * p.ry * r, age: 0, size: 4 + random() * 4});
            }
            for (let i = rings.length - 1; i >= 0; i--) {
                const ring = rings[i];
                ring.age += dt;
                if (ring.age > 1.2) {
                    rings.splice(i, 1);
                    continue;
                }
                const rx = 1 + (ring.age / 1.2) * ring.size;
                ctx.fillStyle = css(hex('#c9d6ff'), 0.45 * (1 - ring.age / 1.2));
                for (let k = 0; k < 16; k++) {
                    const ang = (k / 16) * Math.PI * 2;
                    ctx.fillRect(Math.round(ring.x + Math.cos(ang) * rx), Math.round(ring.y + Math.sin(ang) * rx * 0.3), 1, 1);
                }
            }
        };
    }
};
