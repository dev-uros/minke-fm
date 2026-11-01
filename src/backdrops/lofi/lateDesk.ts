import {Backdrop, bayer, css, disc, ditherPick, hash, hex, pixels, pulse, RGB, rng} from '../pixel';

/**
 * A desk in a dark bedroom late at night: a record turning on a little
 * turntable, a cat curled up asleep beside it breathing slowly, string lights
 * along the wall and the moon in the window with clouds drifting past.
 */
export const LATE_DESK: Backdrop = {
    id: 'lofi-late-desk',
    name: 'Late-night desk',
    bpm: 78,
    create(W, H) {
        const random = rng(23);
        const cx = Math.round(W / 2);
        const desk = Math.round(H * 0.66);
        const win = {x0: cx - 42, y0: 24, x1: cx + 42, y1: 98};
        const moon = {x: win.x0 + 58, y: win.y0 + 18};

        // Swags of string lights: two curves meeting at a hook in the middle.
        const wireY = (x: number) => {
            const half = x < cx ? [4, cx] : [cx, W - 4];
            const u = (x - half[0]) / (half[1] - half[0]);
            return Math.round(9 + 13 * Math.sin(Math.PI * u));
        };
        const bulbColours = ['#ffcf7a', '#ff9a6a', '#ffe8b0', '#f7a8c8', '#9fd8c0'].map(hex);
        const bulbs: Array<{x: number, y: number, c: RGB, phase: number}> = [];
        for (let x = 9; x < W - 6; x += 10) {
            bulbs.push({x, y: wireY(x) + 1, c: bulbColours[bulbs.length % bulbColours.length], phase: random() * 6});
        }

        const wall = ['#08060e', '#0e0a16', '#161020', '#21162a', '#2f1e32', '#432a3a', '#5a3840'].map(hex);
        const sky = ['#0a0e2c', '#141b46', '#202760', '#323474'].map(hex);

        // Everything that never moves.
        const room = pixels(W, H, put => {
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    if (y >= desk) {
                        const v = y < desk + 3 ? 0 : (y - desk) / (H - desk);
                        const c = y === desk ? hex('#8a5a3e') : y < desk + 3 ? hex('#5e3c2b')
                            : ditherPick([hex('#3a241c'), hex('#26170f'), hex('#160d09')], v, x, y);
                        const grain = y > desk + 3 && Math.sin(x * 0.05 + Math.sin(y * 0.7) * 3 + y * 1.3) > 0.97;
                        put(x, y, grain ? hex('#22150e') : c);
                        continue;
                    }
                    // The wall is lit from the string lights above and the desk below.
                    const top = Math.exp(-Math.pow((y - 14) / 34, 2)) * 0.55;
                    const low = Math.max(0, 1 - Math.hypot(x - cx, (y - desk) * 1.6) / (W * 0.5)) * 0.6;
                    put(x, y, ditherPick(wall, Math.min(1, top + low), x, y));
                }
            }
            // Night sky in the window, stars, the moon and a roofline.
            for (let y = win.y0; y < win.y1; y++)
                for (let x = win.x0; x < win.x1; x++)
                    put(x, y, ditherPick(sky, (y - win.y0) / (win.y1 - win.y0), x, y));
            for (let i = 0; i < 26; i++)
                put(win.x0 + random() * (win.x1 - win.x0), win.y0 + random() * 34, hex('#d8dcff'), 80 + random() * 170);
            for (let y = -16; y <= 16; y++)
                for (let x = -16; x <= 16; x++) {
                    const d = Math.hypot(x, y);
                    if (d > 7 && d < 16 && (16 - d) / 14 > bayer(x, y) + 0.15) put(moon.x + x, moon.y + y, hex('#3a3f86'));
                }
            disc(put, moon.x, moon.y, 7, (x, y) =>
                (x * 5 + y * 3) % 13 === 0 || (x - moon.x + 3) ** 2 + (y - moon.y - 1) ** 2 < 4 ? hex('#d3c79f') : hex('#f4ead0'));
            const roof = hex('#0b0a1a');
            let rx = win.x0;
            while (rx < win.x1) {
                const w = 9 + Math.floor(random() * 10);
                const h = 6 + Math.floor(random() * 10);
                for (let x = rx; x < Math.min(rx + w, win.x1); x++) {
                    const peak = h + Math.round(Math.min(x - rx, rx + w - x) * 0.6);
                    for (let y = win.y1 - peak; y < win.y1; y++) put(x, y, roof);
                }
                if (random() < 0.6) put(rx + 3, win.y1 - 3, hex('#f2b35a'));
                if (random() < 0.4) put(rx + 6, win.y1 - 4, hex('#f2b35a'));
                rx += w;
            }
        });

        const r = room.ctx;
        // Window frame, cross bar, sill.
        r.fillStyle = '#1b121a';
        r.fillRect(win.x0 - 3, win.y0 - 3, win.x1 - win.x0 + 6, 3);
        r.fillRect(win.x0 - 3, win.y0, 3, win.y1 - win.y0);
        r.fillRect(win.x1, win.y0, 3, win.y1 - win.y0);
        r.fillRect(cx - 1, win.y0, 2, win.y1 - win.y0);
        r.fillRect(win.x0, win.y0 + 36, win.x1 - win.x0, 2);
        r.fillStyle = '#3b2a2e';
        r.fillRect(win.x0 - 7, win.y1, win.x1 - win.x0 + 14, 4);
        r.fillStyle = '#6a4a40';
        r.fillRect(win.x0 - 7, win.y1, win.x1 - win.x0 + 14, 1);
        // Curtains on a rod, gathered at the sides.
        r.fillStyle = '#2a1a22';
        r.fillRect(win.x0 - 14, win.y0 - 7, win.x1 - win.x0 + 28, 2);
        for (const side of [-1, 1]) {
            for (let y = win.y0 - 5; y < win.y1 + 8; y++) {
                const tie = Math.abs(y - (win.y0 + 48));
                const w = 9 - (tie < 6 ? 3 - Math.floor(tie / 2) : 0);
                for (let k = 0; k < w; k++) {
                    const x = side < 0 ? win.x0 - 12 + k : win.x1 + 12 - k;
                    r.fillStyle = k % 3 === 0 ? '#24121e' : k % 3 === 1 ? '#3c2034' : '#4f2a42';
                    r.fillRect(x, y, 1, 1);
                }
            }
        }

        // Turntable: wooden plinth with the top face seen from slightly above.
        const tt = {x: Math.max(cx - 100, 26), w: 74};
        const pc = {x: tt.x + 31, y: desk - 17, rx: 26, ry: 8};
        r.fillStyle = '#4a2f22';
        r.fillRect(tt.x, desk - 7, tt.w, 6);
        r.fillStyle = '#7a5038';
        r.fillRect(tt.x + 1, desk - 28, tt.w - 2, 21);
        r.fillStyle = '#9a6a4a';
        r.fillRect(tt.x + 1, desk - 28, tt.w - 2, 1);
        r.fillRect(tt.x, desk - 7, tt.w, 1);
        r.fillStyle = '#120b0c';
        r.fillRect(tt.x + 2, desk - 1, 3, 1);
        r.fillRect(tt.x + tt.w - 5, desk - 1, 3, 1);
        r.fillStyle = '#ff6a4a';
        r.fillRect(tt.x + 4, desk - 4, 1, 1);
        r.fillStyle = '#d0c0a8';
        r.fillRect(tt.x + tt.w - 10, desk - 5, 2, 2);
        r.fillRect(tt.x + tt.w - 6, desk - 5, 2, 2);
        for (let y = -pc.ry - 1; y <= pc.ry + 1; y++) {
            for (let x = -pc.rx - 1; x <= pc.rx + 1; x++) {
                const d = Math.hypot(x / (pc.rx + 1), y / (pc.ry + 1));
                if (d > 1) continue;
                const e = Math.hypot(x / pc.rx, y / pc.ry);
                let c = '#5c5660';
                if (e <= 1) c = e < 0.3 ? '#b8403a' : Math.floor(e * 9) % 2 ? '#141018' : '#1c1722';
                if (e < 0.3 && x === 0 && y === 0) c = '#e8dcc8';
                r.fillStyle = c;
                r.fillRect(pc.x + x, pc.y + y, 1, 1);
            }
        }
        // Sleeves leaning against the turntable.
        const sleeves: Array<[number, string, string]> = [[-22, '#2f5670', '#e0b070'], [-14, '#9a4a36', '#f2dcb8']];
        for (const [dx, bg, print] of sleeves) {
            for (let y = 0; y < 21; y++) {
                const x = tt.x + dx + Math.floor((21 - y) / 6);
                r.fillStyle = bg;
                r.fillRect(x, desk - 21 + y, 19, 1);
            }
            r.fillStyle = print;
            r.fillRect(tt.x + dx + 7, desk - 14, 6, 6);
            r.fillStyle = 'rgba(0,0,0,0.3)';
            r.fillRect(tt.x + dx + 1, desk - 1, 19, 1);
        }
        // Books stacked at the far end.
        const books: Array<[number, string]> = [[26, '#3f5a46'], [22, '#7a3a3a'], [25, '#c09a5a'], [20, '#344a6a'], [23, '#6a4a7a']];
        let by = desk;
        for (const [w, c] of books) {
            const bx = Math.min(cx + 80, W - 40) + Math.floor(random() * 3);
            r.fillStyle = c;
            r.fillRect(bx, by - 5, w, 5);
            r.fillStyle = 'rgba(255,230,200,0.25)';
            r.fillRect(bx, by - 5, w, 1);
            r.fillStyle = 'rgba(0,0,0,0.3)';
            r.fillRect(bx + w - 3, by - 5, 1, 5);
            by -= 5;
        }

        const glow = r.createRadialGradient(cx, 16, 2, cx, 16, W * 0.6);
        glow.addColorStop(0, 'rgba(255,190,120,1)');
        glow.addColorStop(1, 'rgba(255,190,120,0)');
        const wire = hex('#1a1016');

        const clouds = [0, 1, 2].map(i => {
            const w = 22 + i * 6, h = 6;
            const sprite = pixels(w, h, put => {
                for (let y = 0; y < h; y++)
                    for (let x = 0; x < w; x++) {
                        const d = Math.hypot((x - w / 2) / (w / 2), (y - h * 0.6) / (h / 2));
                        if (d < 1 && (1 - d) * 2 > ((x * 3 + y * 7) % 5) / 5) put(x, y, y < 2 ? hex('#5a5c94') : hex('#3a3c74'));
                    }
            });
            return {sprite, y: win.y0 + 8 + i * 9, speed: 1.2 + i * 0.5, offset: i * 40};
        });

        const cat = {x: Math.min(cx + 44, W - 62), rx: 20};
        const catColours = {body: '#a4582f', stripe: '#7e3f22', rim: '#e09a5c', tail: '#b8673a'};

        return (ctx, t, beat) => {
            const kick = pulse(beat);
            ctx.drawImage(room.canvas, 0, 0);

            // Clouds sliding across the window.
            ctx.save();
            ctx.beginPath();
            ctx.rect(win.x0, win.y0, win.x1 - win.x0, 36);
            ctx.clip();
            for (const c of clouds) {
                const span = win.x1 - win.x0 + c.sprite.canvas.width;
                const x = win.x1 - ((t * c.speed + c.offset) % span);
                ctx.globalAlpha = 0.8;
                ctx.drawImage(c.sprite.canvas, Math.round(x), c.y);
            }
            ctx.globalAlpha = 1;
            ctx.restore();
            ctx.fillStyle = '#1b121a';
            ctx.fillRect(cx - 1, win.y0, 2, 36);

            // Light catching the grooves as the record turns.
            const a = t * 3.46;
            for (const off of [0, Math.PI]) {
                for (let k = 0; k < 6; k++) {
                    const f = 0.4 + k * 0.11;
                    ctx.fillStyle = css(hex('#6a6080'), 0.9 - k * 0.08);
                    ctx.fillRect(Math.round(pc.x + Math.cos(a + off) * f * pc.rx), Math.round(pc.y + Math.sin(a + off) * f * pc.ry), 1, 1);
                }
            }
            ctx.fillStyle = '#f2d8a0';
            ctx.fillRect(Math.round(pc.x + Math.cos(a) * 3), Math.round(pc.y + Math.sin(a) * 1), 1, 1);

            // Tone arm resting in the groove.
            const pivot = {x: tt.x + tt.w - 8, y: desk - 24};
            const head = {x: pc.x + 16, y: pc.y + 2};
            ctx.fillStyle = '#8c8070';
            ctx.fillRect(pivot.x - 2, pivot.y - 1, 4, 3);
            ctx.fillStyle = '#ddd0bc';
            const steps = Math.max(Math.abs(head.x - pivot.x), Math.abs(head.y - pivot.y));
            for (let i = 0; i <= steps; i++) {
                ctx.fillRect(Math.round(pivot.x + (head.x - pivot.x) * i / steps), Math.round(pivot.y + (head.y - pivot.y) * i / steps), 1, 1);
            }
            ctx.fillRect(head.x - 1, head.y, 2, 2);
            ctx.fillStyle = '#4a4040';
            ctx.fillRect(pivot.x + 2, pivot.y - 2, 2, 2);

            // Notes drifting up from the record.
            for (let j = 0; j < 3; j++) {
                const age = (t + j * 2.3) % 7;
                const nx = Math.round(pc.x - 4 + j * 6 + Math.sin(age * 1.3 + j) * 3);
                const ny = Math.round(pc.y - 10 - age * 5);
                ctx.fillStyle = css(hex('#f6d9a8'), 0.7 * Math.min(1, age) * (1 - age / 7));
                ctx.fillRect(nx, ny, 2, 2);
                ctx.fillRect(nx + 1, ny - 4, 1, 4);
                if (j === 1) ctx.fillRect(nx + 2, ny - 4, 1, 1);
            }

            // The cat: a curled loaf whose back rises and falls.
            const breath = (Math.sin(t * Math.PI * 2 / 4.2) + 1) / 2;
            const ry = 10 + breath * 1.5;
            const rx = cat.rx + breath * 0.6;
            for (let dy = 0; dy <= Math.ceil(ry); dy++) {
                const e = dy / ry;
                if (e > 1) continue;
                const half = Math.round(rx * Math.sqrt(1 - e * e));
                const y = desk - 1 - dy;
                for (let x = cat.x - half; x <= cat.x + half; x++) {
                    const top = dy >= Math.ceil(ry) - 1 || (dy > ry * 0.85 && Math.abs(x - cat.x) > half - 2);
                    ctx.fillStyle = top ? catColours.rim : (x + dy * 2) % 6 === 0 ? catColours.stripe : catColours.body;
                    ctx.fillRect(x, y, 1, 1);
                }
            }
            // Head tucked in at the left end, resting on the paws.
            const hx = cat.x - cat.rx + 2, hy = desk - 7;
            for (let y = -6; y <= 6; y++)
                for (let x = -7; x <= 7; x++) {
                    if (x * x / 49 + y * y / 36 > 1 || hy + y >= desk) continue;
                    ctx.fillStyle = y <= -5 || (y < -2 && x < -5) ? catColours.rim : catColours.body;
                    ctx.fillRect(hx + x, hy + y, 1, 1);
                }
            // Ears.
            for (const ex of [-6, 2]) {
                for (let k = 0; k < 4; k++) {
                    ctx.fillStyle = catColours.body;
                    ctx.fillRect(hx + ex + Math.floor(k / 2), hy - 5 - k, 4 - k, 1);
                }
                ctx.fillStyle = catColours.rim;
                ctx.fillRect(hx + ex + 1, hy - 8, 1, 1);
                ctx.fillStyle = '#e0a090';
                ctx.fillRect(hx + ex + 1, hy - 6, 2, 1);
            }
            // Closed eyes and a pale muzzle.
            ctx.fillStyle = '#4a2010';
            ctx.fillRect(hx - 4, hy, 3, 1);
            ctx.fillRect(hx + 2, hy, 3, 1);
            ctx.fillStyle = '#f0d0b0';
            ctx.fillRect(hx - 2, hy + 2, 5, 2);
            ctx.fillStyle = '#d88a9a';
            ctx.fillRect(hx, hy + 2, 1, 1);
            // Front paws tucked under the chin.
            ctx.fillStyle = '#f0d0b0';
            ctx.fillRect(hx - 3, desk - 2, 4, 2);
            ctx.fillRect(hx + 2, desk - 2, 4, 2);
            // Tail wrapped round the front, its tip twitching now and then.
            const twitch = Math.max(0, Math.sin(t * 0.9)) * Math.max(0, Math.sin(t * 2.7));
            for (let i = 0; i < 32; i++) {
                const tip = Math.max(0, i - 24);
                const x = cat.x + cat.rx + 1 - i;
                const y = desk - 2 - (i < 4 ? 3 - i : 0) - Math.round(tip * twitch * 0.7);
                ctx.fillStyle = catColours.tail;
                ctx.fillRect(x, y, 1, i < 27 ? 2 : 1);
                ctx.fillStyle = catColours.rim;
                ctx.fillRect(x, y, 1, 1);
            }

            // String lights, glowing softly and breathing with the beat.
            ctx.fillStyle = css(wire);
            for (let x = 4; x < W - 4; x++) ctx.fillRect(x, wireY(x), 1, 1);
            for (const b of bulbs) {
                const level = 0.65 + 0.25 * Math.sin(t * 1.1 + b.phase) + 0.15 * kick;
                ctx.fillStyle = css(b.c, 0.12 * level);
                ctx.fillRect(b.x - 2, b.y - 1, 5, 5);
                ctx.fillStyle = css(b.c, Math.min(1, 0.5 + level * 0.5));
                ctx.fillRect(b.x, b.y, 1, 2);
                if (hash(b.x, Math.floor(t * 0.5)) < 0.05) {
                    ctx.fillStyle = 'rgba(255,255,255,0.6)';
                    ctx.fillRect(b.x, b.y, 1, 1);
                }
            }

            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.06 + 0.025 * kick;
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        };
    }
};
