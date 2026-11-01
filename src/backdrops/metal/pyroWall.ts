import {Backdrop, css, ditherPick, hash, hex, pixels, pulse, RGB, rng, wrappingNoise, bayer} from '../pixel';

/**
 * A wall of amp cabinets filling the back of a dark stage. Pyro columns
 * blast up from the floor on the beat in shifting patterns, a curtain of
 * sparks rains from the truss, and smoke hangs over everything.
 */
export const PYRO_WALL: Backdrop = {
    id: 'metal-pyro-wall',
    name: 'Pyro wall',
    bpm: 168,
    create(W, H) {
        const random = rng(29);
        const stageY = Math.round(H * 0.8);
        const cabW = 26, cabH = 24, rows = 3;
        const wallTop = stageY - rows * cabH - 10;
        const cols = Math.ceil(W / cabW) + 1;
        const offX = Math.round((W - cols * cabW) / 2);

        const backPal = ['#020204', '#05070c', '#0a1020', '#121c34'].map(hex);
        const wall = pixels(W, H, put => {
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) {
                    if (y >= wallTop && y < stageY) {
                        put(x, y, hex('#020203'));
                    } else if (y < wallTop) {
                        // Cold blue backlight leaking over the top of the wall.
                        const v = Math.max(0, 1 - (wallTop - y) / 50) * (0.7 + 0.3 * Math.sin(x * 0.05));
                        put(x, y, ditherPick(backPal, v, x, y));
                    } else if (y >= stageY) {
                        const f = (y - stageY) / (H - stageY);
                        const grate = (y - stageY) % 4 === 0 || (Math.round((x - W / 2) / (4 + f * 10)) % 2 === 0 && x % 2 === 0);
                        put(x, y, ditherPick([hex('#030304'), hex('#0a0a0e'), hex('#14141a')], grate ? 0.5 - f * 0.3 : 0.2 - f * 0.2, x, y));
                    }
                }
        });
        const g = wall.ctx;
        g.fillStyle = '#2a2c34';
        g.fillRect(0, stageY, W, 1);
        const capPositions: Array<[number, number]> = [];
        const leds: Array<[number, number, number]> = [];
        for (let c = 0; c < cols; c++) {
            const x = offX + c * cabW;
            // Amp heads along the top.
            g.fillStyle = '#060607';
            g.fillRect(x, wallTop, cabW - 1, 9);
            g.fillStyle = '#3a3c44';
            g.fillRect(x + 2, wallTop + 3, cabW - 5, 3);
            g.fillStyle = '#16161a';
            for (let k = 0; k < 6; k++) g.fillRect(x + 4 + k * 3, wallTop + 4, 1, 1);
            g.fillStyle = '#2a2c34';
            g.fillRect(x, wallTop, cabW - 1, 1);
            leds.push([x + cabW - 4, wallTop + 2, random()]);
            for (let r = 0; r < rows; r++) {
                const y = wallTop + 10 + r * cabH;
                g.fillStyle = '#08080a';
                g.fillRect(x, y, cabW - 1, cabH - 1);
                g.fillStyle = '#141519';
                g.fillRect(x + 1, y + 1, cabW - 3, cabH - 3);
                // Four exposed speakers per cab.
                for (const [sx, sy] of [[7, 6], [18, 6], [7, 16], [18, 16]]) {
                    const px = x + sx, py = y + sy;
                    for (let dy = -4; dy <= 4; dy++)
                        for (let dx = -4; dx <= 4; dx++) {
                            const d = Math.hypot(dx, dy);
                            if (d > 4.3) continue;
                            g.fillStyle = d > 3.4 ? '#22242a' : d > 1.6 ? css(ditherPick([hex('#0c0c0f'), hex('#18181d')], 0.5 - dy / 8, px + dx, py + dy)) : '#2c2e35';
                            g.fillRect(px + dx, py + dy, 1, 1);
                        }
                    capPositions.push([px, py]);
                }
                g.fillStyle = '#5c5f66';
                for (const [px, py] of [[x, y], [x + cabW - 3, y], [x, y + cabH - 3], [x + cabW - 3, y + cabH - 3]]) g.fillRect(px, py, 2, 2);
            }
        }

        // Pyro launchers on the floor in front of the wall.
        const count = W < 300 ? 5 : W < 380 ? 6 : 7;
        const launchers = Array.from({length: count}, (_, i) => Math.round(W * (i + 0.5) / count));
        for (const x of launchers) {
            g.fillStyle = '#16161a';
            g.fillRect(x - 4, stageY - 3, 9, 4);
            g.fillStyle = '#3a3c44';
            g.fillRect(x - 4, stageY - 3, 9, 1);
        }

        // Smoke hanging under the truss.
        const big = wrappingNoise(W, H, 30, random);
        const smoke = pixels(W, H, put => {
            const c = hex('#8890a8');
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) {
                    const band = Math.max(0, 1 - y / (H * 0.55)) + Math.max(0, (y - stageY) / 40);
                    if (big(x, y) * band > 0.2 + bayer(x, y) * 0.5) put(x, y, c);
                }
        });

        // Which launchers fire on a beat: all on the downbeat, alternating
        // pairs between, and a chase every fourth bar.
        const fires = (i: number, b: number) => {
            const bar = Math.floor(b / 4);
            const pos = b % 4;
            if (bar % 4 === 3) return i === pos || i === count - 1 - pos;
            if (pos === 0) return true;
            if (pos === 2) return bar % 2 === 0 ? i % 2 === 0 : i % 2 === 1;
            return false;
        };
        const spb = 60 / 168;
        const flamePal: RGB[] = ['#fff6c8', '#ffd060', '#ff8a20', '#e0400c', '#7a1404'].map(hex);

        const sparks = Array.from({length: 160}, () => ({x: random() * W, y: random() * H, vy: 20 + random() * 40, life: random()}));
        const steelBlue = hex('#6a8cff');
        let last = 0;

        return (ctx, t, beat) => {
            const dt = Math.min(0.1, Math.max(0, t - last));
            last = t;
            const k = pulse(beat);
            const b = Math.floor(beat);

            ctx.drawImage(wall.canvas, 0, 0);

            // Cold rim light across the top of the wall on the downbeats.
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = css(steelBlue, (b % 4 === 0 ? 0.18 : 0.06) * k + 0.03);
            ctx.fillRect(0, wallTop - 14, W, 14);

            // The cones jump on every beat.
            ctx.fillStyle = css(hex('#9aa0b8'), 0.12 + 0.35 * k);
            for (const [px, py] of capPositions) ctx.fillRect(px, py - 1, 1, 1);
            for (const [lx, ly, s] of leds) {
                ctx.fillStyle = s < 0.7 ? 'rgba(255,40,30,0.9)' : `rgba(80,255,120,${(0.4 + 0.5 * k).toFixed(3)})`;
                ctx.fillRect(lx, ly, 1, 1);
            }

            // Flames: find each launcher's last firing and draw its column.
            launchers.forEach((x, i) => {
                let age = -1;
                for (let back = 0; back < 3; back++) {
                    if (fires(i, b - back)) {
                        age = (beat - (b - back)) * spb;
                        break;
                    }
                }
                if (age < 0 || age > 0.7) return;
                const rise = Math.min(1, age / 0.08);
                const fade = age < 0.3 ? 1 : Math.max(0, 1 - (age - 0.3) / 0.4);
                const bottom = stageY - 3 - (age > 0.3 ? (age - 0.3) * 280 : 0);
                const tall = 0.65 + 0.35 * (1 - Math.abs(i - (count - 1) / 2) / (count / 2));
                const top = stageY - 3 - rise * (stageY * 0.85) * tall - age * 40;
                const span = bottom - top;
                if (span < 2) return;

                // Light thrown on the wall and floor.
                const light = ctx.createRadialGradient(x, stageY - 10, 2, x, stageY - 10, 60);
                light.addColorStop(0, css(flamePal[2], 0.22 * fade * rise));
                light.addColorStop(1, css(flamePal[2], 0));
                ctx.fillStyle = light;
                ctx.fillRect(x - 60, 0, 120, H);

                for (let y = Math.floor(top); y < bottom; y++) {
                    const f = (bottom - y) / span;
                    const jitter = (hash(y, Math.floor(t * 30) + i * 7) - 0.5) * 3;
                    const w = (4 + 8 * Math.sin(Math.min(1, f * 1.4 + 0.15) * Math.PI) * (1 - f * 0.35)) * (0.6 + 0.4 * fade);
                    const outer = flamePal[Math.min(4, 2 + Math.floor(f * 2.5))];
                    ctx.fillStyle = css(outer, 0.55 * fade);
                    ctx.fillRect(Math.round(x - w + jitter), y, Math.round(w * 2) + 1, 1);
                    if (f < 0.75) {
                        const cw = w * 0.45 * (1 - f);
                        ctx.fillStyle = css(flamePal[f < 0.35 ? 0 : 1], 0.85 * fade);
                        ctx.fillRect(Math.round(x - cw + jitter * 0.5), y, Math.round(cw * 2) + 1, 1);
                    }
                }
            });

            // Downbeat of every fourth bar: a white flash.
            if (b % 16 === 0) {
                ctx.fillStyle = `rgba(255,240,220,${(0.16 * k).toFixed(3)})`;
                ctx.fillRect(0, 0, W, H);
            }

            // Sparks fall from the truss and fade before the floor.
            for (const s of sparks) {
                s.vy += 50 * dt;
                s.y += s.vy * dt;
                s.life -= dt * 0.5;
                if (s.y > stageY || s.life <= 0) {
                    s.x = 8 + 16 * Math.floor(random() * W / 16) + Math.round((random() - 0.5) * 3);
                    s.y = 4 + random() * 3;
                    s.vy = 10 + random() * 30;
                    s.life = 0.7 + random() * 0.3;
                }
                const c = flamePal[s.life > 0.8 ? 0 : s.life > 0.5 ? 1 : 2];
                const a = Math.min(1, s.life * 1.3) * (0.5 + 0.5 * Math.sin(t * 25 + s.x));
                ctx.fillStyle = css(c, a);
                ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
                ctx.fillStyle = css(c, a * 0.35);
                ctx.fillRect(Math.round(s.x), Math.round(s.y) - 2, 1, 2);
            }

            const drift = Math.floor(t * 4) % W;
            ctx.globalAlpha = 0.07 + 0.03 * k;
            ctx.drawImage(smoke.canvas, -drift, 0);
            ctx.drawImage(smoke.canvas, W - drift, 0);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';

            // Truss across the top with the gerbs hanging from it.
            ctx.fillStyle = '#1a1b20';
            ctx.fillRect(0, 0, W, 3);
            ctx.fillStyle = '#3a3c44';
            ctx.fillRect(0, 3, W, 1);
            ctx.fillStyle = css(flamePal[1], 0.7 + 0.3 * Math.sin(t * 20));
            for (let x = 8; x < W; x += 16) ctx.fillRect(x, 4, 1, 1);
        };
    }
};
