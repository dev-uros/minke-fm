import {Backdrop, css, ditherPick, hash, hex, pixels, pulse, RGB, rng} from '../pixel';

/**
 * A stadium concert seen from the stands: LED walls pulsing behind the stage,
 * searchlights sweeping the sky, phone lights twinkling round the bowl,
 * confetti drifting down and a firework bursting on every bar.
 */
export const STADIUM_SHOW: Backdrop = {
    id: 'pop-stadium-show',
    name: 'Stadium show',
    bpm: 126,
    create(W, H) {
        const random = rng(91);
        const cx = Math.round(W / 2);
        const stageY = 118;
        const screen = {x: cx - 30, y: 62, w: 60, h: 36};
        const sideW = 14;
        const sides = [cx - 52, cx + 52 - sideW];
        const colours = ['#ff3fa4', '#3fd8ff', '#ffe04a', '#8a5bff', '#5aff9a', '#ff8a3a'].map(hex);

        const sky = ['#05031a', '#0c0630', '#1a0b48', '#2e1060', '#4a1870', '#6e2274'].map(hex);
        const standTop = (x: number) => {
            // The bowl rises towards the edges of the picture.
            const f = Math.abs(x - cx) / (W / 2);
            return Math.round(stageY - 6 - Math.pow(f, 1.6) * 52);
        };

        const back = pixels(W, H, put => {
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, y / stageY, x, y));
            for (let i = 0; i < 50; i++) put(random() * W, random() * 50, hex('#ffffff'), 60 + random() * 120);
            // The stands, with a lit roof edge.
            const stand = ['#07040f', '#0e0820', '#170c30'].map(hex);
            for (let x = 0; x < W; x++) {
                const top = standTop(x);
                for (let y = top; y < H; y++) put(x, y, y === top ? hex('#4a3a7a') : ditherPick(stand, 0.8 - (y - top) / 60, x, y));
                // Tier lines.
                for (let k = 1; k < 6; k++) put(x, top + k * 8, stand[2]);
            }
            // Stage roof truss and deck.
            const truss = hex('#2a2440'), trussLit = hex('#6a5a9a');
            const left = sides[0] - 6, right = sides[1] + sideW + 6;
            for (let x = left; x <= right; x++) {
                put(x, 48, trussLit);
                put(x, 52, truss);
                if ((x - left) % 4 < 2) put(x, 49 + ((x - left) % 4), truss);
                else put(x, 51 - ((x - left) % 4 - 2), truss);
            }
            for (const px of [left, left + 1, right - 1, right]) for (let y = 48; y < stageY; y++) put(px, y, (y % 4 === 0) ? trussLit : truss);
            for (let y = stageY; y < stageY + 6; y++) {
                for (let x = left - 8; x <= right + 8; x++) put(x, y, hex(y === stageY ? '#8a7ab0' : '#120c22'));
            }
            // Screen frames.
            for (const [x0, y0, w, h] of [[screen.x, screen.y, screen.w, screen.h], [sides[0], 70, sideW, 44], [sides[1], 70, sideW, 44]]) {
                for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) put(x, y, hex('#05030a'));
            }
            // Floodlight towers at the edges.
            for (const fx of [Math.round(W * 0.06), Math.round(W * 0.94)]) {
                for (let y = 14; y < standTop(fx); y++) put(fx, y, hex('#1a1430'));
            }
        });

        const towers = [Math.round(W * 0.06), Math.round(W * 0.94)];

        // Phone lights round the bowl.
        const phones = Array.from({length: Math.round(W * 0.9)}, () => {
            const x = Math.floor(random() * W);
            const y = standTop(x) + 2 + Math.floor(random() * 46);
            return {x, y, seed: random() * 100, warm: random() < 0.5};
        }).filter(p => p.y < H);

        // Crowd on the floor in front of the stage.
        const crowd = Array.from({length: Math.ceil(W / 3)}, (_, i) => ({
            x: i * 3 + Math.floor(random() * 2),
            y: 150 + Math.floor(random() * 8),
            phase: random() < 0.6 ? 0 : 0.5,
            arm: random() < 0.3,
            stick: random() < 0.15 ? colours[Math.floor(random() * colours.length)] : null
        }));

        // Further back on the pitch, a smaller crowd.
        const pitch = Array.from({length: Math.ceil(W / 2.5)}, (_, i) => ({
            x: Math.round(i * 2.5 + random() * 2), y: 134 + Math.floor(random() * 10), phase: random() < 0.5 ? 0 : 0.5, lit: random() < 0.5
        })).sort((a, b) => a.y - b.y);

        const confetti = Array.from({length: 120}, () => ({
            x: random() * W, y: random() * H, speed: 8 + random() * 10, seed: random() * 10,
            c: colours[Math.floor(random() * colours.length)]
        }));

        const heart = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];

        const firework = (ctx: CanvasRenderingContext2D, bar: number, age: number) => {
            if (bar < 0 || age < 0 || age > 2.4) return;
            const bx = Math.round(W * (0.15 + 0.7 * hash(bar, 1)));
            const by = Math.round(18 + 30 * hash(bar, 2));
            const c = colours[bar % colours.length];
            const c2 = colours[(bar + 2) % colours.length];
            const n = 44;
            const fade = 1 - age / 2.4;
            // The flash at the moment of the burst.
            if (age < 0.15) {
                ctx.fillStyle = css([255, 255, 255], 0.9 * (1 - age / 0.15));
                ctx.fillRect(bx - 1, by - 1, 3, 3);
            }
            for (let k = 0; k < n; k++) {
                const a = (k / n) * Math.PI * 2 + hash(bar, k) * 0.2;
                const v = 27 + hash(k, bar) * 9;
                for (let trail = 0; trail < 3; trail++) {
                    const tt = Math.max(0, age - trail * 0.06);
                    const r = v * tt * (1 - tt * 0.28);
                    const x = Math.round(bx + Math.cos(a) * r);
                    const y = Math.round(by + Math.sin(a) * r + 7 * tt * tt);
                    const sparkle = age > 1.2 && hash(k, Math.floor(age * 20)) < 0.4 ? 0 : 1;
                    ctx.fillStyle = css(trail === 0 ? (k % 2 ? c : c2) : c, fade * sparkle * (trail === 0 ? 1 : 0.5 / trail));
                    ctx.fillRect(x, y, 1, 1);
                    if (trail === 0 && age < 1) {
                        ctx.fillStyle = css(c, 0.25 * fade);
                        ctx.fillRect(x - 1, y, 3, 1);
                        ctx.fillRect(x, y - 1, 1, 3);
                    }
                }
            }
        };

        return (ctx, t, beat) => {
            const kick = pulse(beat);
            const bar = Math.floor(beat / 4);
            const b = Math.floor(beat);
            const secPerBeat = 60 / 126;

            ctx.drawImage(back.canvas, 0, 0);

            // Searchlights from behind the stage.
            ctx.globalCompositeOperation = 'lighter';
            for (let k = 0; k < 4; k++) {
                const ox = cx + (k - 1.5) * 26;
                const ang = -Math.PI / 2 + Math.sin(t * 0.6 + k * 1.7) * 0.55;
                const c = colours[(k + Math.floor(beat / 16)) % colours.length];
                const len = 200;
                ctx.fillStyle = css(c, 0.07 + 0.04 * kick);
                ctx.beginPath();
                ctx.moveTo(ox, 54);
                ctx.lineTo(ox + Math.cos(ang - 0.05) * len, 54 + Math.sin(ang - 0.05) * len);
                ctx.lineTo(ox + Math.cos(ang + 0.05) * len, 54 + Math.sin(ang + 0.05) * len);
                ctx.fill();
            }

            // Fireworks: this bar's burst and the tail of the last one.
            firework(ctx, bar, (beat - bar * 4) * secPerBeat);
            firework(ctx, bar - 1, (beat - (bar - 1) * 4) * secPerBeat);

            // Floodlight banks.
            for (const fx of towers) {
                const g = ctx.createRadialGradient(fx, 12, 1, fx, 12, 22);
                g.addColorStop(0, 'rgba(200,220,255,0.35)');
                g.addColorStop(1, 'rgba(200,220,255,0)');
                ctx.fillStyle = g;
                ctx.fillRect(fx - 22, -10, 44, 44);
            }
            ctx.globalCompositeOperation = 'source-over';
            for (const fx of towers) {
                for (let y = 0; y < 3; y++) for (let x = 0; x < 5; x++) {
                    ctx.fillStyle = (x + y) % 2 ? '#e8f0ff' : '#b8c8ff';
                    ctx.fillRect(fx - 2 + x, 10 + y, 1, 1);
                }
            }

            // Main LED wall, in 2x2 blocks; its picture changes every 8 bars.
            const mode = Math.floor(beat / 32) % 3;
            const scx = screen.w / 4, scy = screen.h / 4;
            for (let j = 0; j < screen.h / 2; j++) {
                for (let i = 0; i < screen.w / 2; i++) {
                    let v = 0, ci = 0;
                    const dx = i - scx + 0.5, dy = j - scy + 0.5;
                    if (mode === 0) {
                        const d = Math.hypot(dx, dy * 1.2);
                        v = 0.5 + 0.5 * Math.sin(d * 0.9 - beat * Math.PI);
                        ci = Math.floor(d / 4 + beat) % colours.length;
                    } else if (mode === 1) {
                        const level = 0.3 + 0.6 * Math.abs(Math.sin(i * 0.7 + beat * 1.3)) * (0.6 + 0.4 * kick);
                        v = (screen.h / 2 - j) / (screen.h / 2) < level ? 1 : 0.08;
                        ci = Math.floor(i / 5 + bar) % colours.length;
                    } else {
                        const s = 1 + Math.floor(kick * 1.5);
                        const hx = Math.floor((dx + 3.5 * s) / s), hy = Math.floor((dy + 3 * s) / s);
                        const inHeart = hy >= 0 && hy < heart.length && hx >= 0 && hx < 7 && heart[hy][hx] === '#';
                        v = inHeart ? 1 : 0.15 + 0.15 * Math.sin(i * 0.5 + j * 0.5 - beat * 2);
                        ci = inHeart ? 0 : 3;
                    }
                    if (v < 0.05) continue;
                    ctx.fillStyle = css(colours[ci], Math.min(1, v * (0.75 + 0.25 * kick)));
                    ctx.fillRect(screen.x + i * 2, screen.y + j * 2, 2, 2);
                }
            }
            // Side screens: colour bands sliding upwards.
            for (const sx of sides) {
                for (let j = 0; j < 22; j++) {
                    const ci = Math.floor((j + beat * 2) / 4) % colours.length;
                    for (let i = 0; i < sideW / 2; i++) {
                        ctx.fillStyle = css(colours[(ci + (sx > cx ? 3 : 0)) % colours.length], 0.55 + 0.35 * kick - (i % 2) * 0.1);
                        ctx.fillRect(sx + i * 2, 70 + 42 - j * 2, 2, 2);
                    }
                }
            }
            // Glow off the screens onto the stage and floor.
            ctx.globalCompositeOperation = 'lighter';
            const glow = ctx.createRadialGradient(cx, stageY, 4, cx, stageY, W * 0.5);
            glow.addColorStop(0, css(colours[bar % colours.length], 0.28 + 0.15 * kick));
            glow.addColorStop(1, css(colours[bar % colours.length], 0));
            ctx.fillStyle = glow;
            ctx.fillRect(0, 60, W, H - 60);
            ctx.globalCompositeOperation = 'source-over';

            // Phone lights twinkle round the stands.
            for (const p of phones) {
                const v = hash(p.seed, Math.floor(t * 2 + p.seed));
                if (v < 0.35) continue;
                ctx.fillStyle = p.warm ? `rgba(255,236,190,${(v * 0.8).toFixed(2)})` : `rgba(200,225,255,${(v * 0.8).toFixed(2)})`;
                ctx.fillRect(p.x, p.y, 1, 1);
            }

            // The crowd on the pitch, bouncing on the beat.
            const rim: RGB = colours[bar % colours.length];
            // Further back the crowd is smaller and darker against the glow.
            for (const p of pitch) {
                const y = p.y - (Math.sin((beat + p.phase) * Math.PI * 2) > 0.3 ? 1 : 0);
                ctx.fillStyle = '#0a0618';
                ctx.fillRect(p.x, y, 1, 1);
                ctx.fillRect(p.x - 1, y + 1, 3, H - y);
                if (p.lit) {
                    ctx.fillStyle = css(rim, 0.45);
                    ctx.fillRect(p.x, y, 1, 1);
                }
            }
            for (const p of crowd) {
                const bounce = Math.round(Math.max(0, Math.sin((beat + p.phase) * Math.PI * 2)) * 1.5);
                const y = p.y - bounce;
                ctx.fillStyle = '#04020a';
                ctx.fillRect(p.x, y, 2, 2);
                ctx.fillRect(p.x - 1, y + 2, 4, H - y);
                ctx.fillStyle = css(rim, 0.85);
                ctx.fillRect(p.x, y, 2, 1);
                if (p.arm) {
                    const sway = Math.round(Math.sin(t * 2.2 + p.x) * 1.2);
                    ctx.fillStyle = '#04020a';
                    ctx.fillRect(p.x + 2 + sway, y - 5, 1, 7);
                    if (p.stick) {
                        ctx.fillStyle = css(p.stick);
                        ctx.fillRect(p.x + 2 + sway, y - 8, 1, 3);
                    }
                }
            }

            // Confetti drifting down over everything.
            for (const c of confetti) {
                const y = (c.y + t * c.speed) % (H + 6) - 3;
                const x = (c.x + Math.sin(t * 1.5 + c.seed) * 4 + W) % W;
                const flip = Math.sin(t * 7 + c.seed * 3);
                ctx.fillStyle = css(c.c, 0.95);
                if (flip > 0.3) ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
                else if (flip > -0.3) ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
                else ctx.fillRect(Math.round(x), Math.round(y), 1, 2);
            }

            if (b % 16 === 0) {
                ctx.fillStyle = `rgba(255,255,255,${(0.08 * kick).toFixed(3)})`;
                ctx.fillRect(0, 0, W, H);
            }
        };
    }
};
