import {Backdrop, bayer, css, ditherPick, hash, hex, pixels, pulse, RGB, rng} from '../pixel';

/**
 * The DJ booth seen from above: two turntables spinning either side of a
 * mixer whose meters bounce to the kick, pads blinking in sequence, and the
 * two tracks' waveforms scrolling past the playhead, beatmatched.
 */
export const DJ_DECKS: Backdrop = {
    id: 'electronic-dj-decks',
    name: 'DJ booth',
    bpm: 126,
    create(W, H) {
        const random = rng(41);
        const cx = Math.round(W / 2);
        const R = 26;
        const sep = Math.round(Math.min(Math.max(W * 0.29, 66), 100));
        const deckY = 116;
        const plate = 34;
        const lights: RGB[] = ['#ff2a6d', '#05d9e8', '#7b2fff', '#39ff14'].map(hex);

        // Booth surface, plinths and mixer body.
        const base = pixels(W, H, put => {
            const surface = ['#050409', '#0a0812', '#110e1c'].map(hex);
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++)
                    put(x, y, ditherPick(surface, 0.25 + 0.5 * Math.sin((x + y * 0.3) * 0.02) ** 2 + (random() - 0.5) * 0.2, x, y));
            for (const d of [-1, 1]) {
                const x0 = cx + d * sep;
                for (let y = -plate; y <= plate; y++)
                    for (let x = -plate; x <= plate; x++) {
                        const edge = Math.max(Math.abs(x), Math.abs(y));
                        const c = edge === plate ? (y === -plate || x === -plate ? '#4a4858' : '#0c0b12')
                            : edge === plate - 1 ? '#3a3946' : '#24232c';
                        put(x0 + x, deckY + y, hex(c));
                    }
                // Pitch fader slot and a start button.
                for (let y = 4; y < 28; y++) put(x0 + plate - 4, deckY + y, hex('#0a090e'));
                for (let y = 0; y < 4; y++)
                    for (let x = 0; x < 6; x++) put(x0 - plate + 3 + x, deckY + plate - 7 + y, hex(y === 0 ? '#6a6a78' : '#4a4a56'));
            }
            const mx0 = cx - 22, my0 = 70;
            for (let y = 0; y < 88; y++)
                for (let x = 0; x < 44; x++) {
                    const edge = x === 0 || y === 0 ? '#3c3a4c' : x === 43 || y === 87 ? '#08070c' : null;
                    put(mx0 + x, my0 + y, hex(edge ?? '#191822'));
                }
            // Fader slots.
            for (const fx of [cx - 14, cx + 13])
                for (let y = 120; y < 144; y++) put(fx, y, hex('#060509'));
            for (let x = cx - 14; x <= cx + 14; x++) put(x, 150, hex('#060509'));
        });

        // A record on its platter, drawn once and rotated each frame.
        const vinyl = (label: RGB) => {
            const S = 2 * (R + 3) + 1, c = R + 3;
            return pixels(S, S, put => {
                for (let y = -c; y <= c; y++)
                    for (let x = -c; x <= c; x++) {
                        const d = Math.hypot(x, y);
                        if (d > c + 0.3) continue;
                        const a = Math.atan2(y, x);
                        let col: RGB;
                        if (d > R + 0.5) {
                            // Platter rim with strobe dots.
                            const dot = d > R + 1.5 && Math.floor(((a + Math.PI) / (Math.PI * 2)) * 48) % 2 === 0;
                            col = hex(dot ? '#d8d8e4' : '#6a6a78');
                        } else if (d > 8.5) {
                            col = hex(Math.floor(d) % 3 === 0 ? '#1b1922' : '#0d0c12');
                            if (Math.floor(d) === 18) col = hex('#08070b');
                        } else {
                            col = Math.abs(a - 0.6) < 0.45 && d > 2 ? hex('#f2ecdc') : label;
                            if (d < 1.2) col = hex('#c8c8d0');
                        }
                        put(c + x, c + y, col);
                    }
            });
        };
        const records = [vinyl(hex('#e04a7a')), vinyl(hex('#3ac0e0'))];

        // A soft sheen that stays still while the record turns under it.
        const sheen = pixels(2 * R + 1, 2 * R + 1, put => {
            for (let y = -R; y <= R; y++)
                for (let x = -R; x <= R; x++) {
                    const d = Math.hypot(x, y);
                    if (d > R || d < 9) continue;
                    const s = Math.cos(Math.atan2(y, x) + 2.3);
                    if (s > 0.75 && (s - 0.75) * 4 > bayer(x, y)) put(R + x, R + y, hex('#b8b0d8'), 60);
                }
        });

        // Tone arms sit over the records.
        const arms = pixels(W, H, put => {
            for (const d of [-1, 1]) {
                const x0 = cx + d * sep;
                const pivot = {x: x0 + plate - 9, y: deckY - plate + 9};
                const tip = {x: x0 + 12, y: deckY + 16};
                for (let y = -3; y <= 3; y++)
                    for (let x = -3; x <= 3; x++)
                        if (x * x + y * y <= 10) put(pivot.x + x, pivot.y + y, hex(x + y < 0 ? '#9a9aa8' : '#5a5a68'));
                const n = Math.max(Math.abs(tip.x - pivot.x), Math.abs(tip.y - pivot.y));
                for (let i = 0; i <= n; i++) {
                    const x = pivot.x + (tip.x - pivot.x) * i / n, y = pivot.y + (tip.y - pivot.y) * i / n;
                    put(x, y, hex('#e0e0ea'));
                    put(x + 1, y, hex('#7a7a88'));
                }
                for (let y = 0; y < 5; y++)
                    for (let x = 0; x < 4; x++) put(tip.x - 2 + x, tip.y - 1 + y, hex(y === 0 ? '#c8c8d4' : '#3a3a46'));
                for (let y = -2; y <= 2; y++)
                    for (let x = -2; x <= 2; x++) put(pivot.x + 4 + x, pivot.y - 4 + y, hex('#2a2a34'));
            }
        });

        // Waveform strips: 16px per beat, 64 beats long so they loop cleanly.
        const PX = 16, L = PX * 64, laneH = 13;
        const wave = (seed: number, cols: [RGB, RGB, RGB]) => pixels(L, laneH, put => {
            const r = rng(seed);
            const mids = Array.from({length: L}, () => r());
            for (let x = 0; x < L; x++) {
                const b = x / PX, beatIdx = Math.floor(b), frac = b - beatIdx;
                const breakdown = beatIdx % 32 >= 24;
                const kick = breakdown ? 0 : Math.exp(-frac * 5);
                const mid = 0.35 + 0.25 * Math.sin(x * 0.045 + seed) + 0.2 * mids[x];
                const h = Math.min(6, Math.round(kick * 4.5 + mid * (breakdown ? 3 : 2.2)));
                for (let dy = -h; dy <= h; dy++) {
                    const e = Math.abs(dy) / Math.max(1, h);
                    put(x, 6 + dy, e < 0.35 ? cols[2] : e < 0.7 ? cols[1] : cols[0]);
                }
                if (x % PX === 0) put(x, 0, beatIdx % 4 === 0 ? hex('#ff4a5a') : hex('#4a4a5a'));
            }
        });
        const waves = [
            wave(3, [hex('#2a5cff'), hex('#ff9a3a'), hex('#fff4e0')]),
            wave(9, [hex('#7b2fff'), hex('#ff4fa8'), hex('#e0faff')])
        ];
        const pw = Math.min(W - 30, 260), px0 = Math.round(cx - pw / 2), py0 = 16;

        const drawWave = (ctx: CanvasRenderingContext2D, strip: HTMLCanvasElement, pos: number, y: number) => {
            let src = ((Math.round(pos) - pw / 2) % L + L) % L;
            let dst = px0, left = pw;
            while (left > 0) {
                const w = Math.min(left, L - src);
                ctx.drawImage(strip, src, 0, w, laneH, dst, y, w, laneH);
                dst += w;
                left -= w;
                src = 0;
            }
        };

        const meter = (ctx: CanvasRenderingContext2D, x: number, level: number) => {
            const n = 14;
            for (let i = 0; i < n; i++) {
                const on = i < Math.round(level * n);
                const c = i >= 12 ? '#ff3a4a' : i >= 9 ? '#f9f871' : '#39ff6a';
                ctx.fillStyle = on ? c : '#15141c';
                ctx.fillRect(x, 116 - i * 3, 2, 2);
            }
        };

        return (ctx, t, beat) => {
            const kick = pulse(beat);
            const section = Math.floor(beat / 32);
            const light = lights[section % lights.length];

            ctx.drawImage(base.canvas, 0, 0);

            // Records turning at 33rpm.
            records.forEach((rec, i) => {
                const x = cx + (i === 0 ? -sep : sep);
                const c = R + 3;
                ctx.save();
                ctx.translate(x + 0.5, deckY + 0.5);
                ctx.rotate(t * 3.46 + i * 1.7);
                ctx.drawImage(rec.canvas, -c - 0.5, -c - 0.5);
                ctx.restore();
                ctx.drawImage(sheen.canvas, x - R, deckY - R);
                // Pitch fader cap and a row of pads lighting in turn.
                ctx.fillStyle = '#c8c8d4';
                ctx.fillRect(x + plate - 6, deckY + 12 + i * 3, 5, 3);
                for (let k = 0; k < 4; k++) {
                    const lit = Math.floor(beat * 2 + i * 2) % 8 === k * 2 || (k === 3 && kick > 0.5 && i === 1);
                    ctx.fillStyle = lit ? css(lights[(k + i) % lights.length], 0.95) : '#2e2d38';
                    ctx.fillRect(x - plate + 3 + k * 6, deckY - plate + 3, 4, 4);
                }
                ctx.fillStyle = Math.floor(beat) % 2 === 0 ? '#39ff6a' : '#1a4a24';
                ctx.fillRect(x - plate + 10, deckY + plate - 6, 1, 2);
            });
            ctx.drawImage(arms.canvas, 0, 0);

            // Mixer: knobs, meters and faders.
            const fadeB = 0.5 + 0.5 * Math.sin(t * 0.15);
            for (const [kx, ch] of [[cx - 15, 0], [cx + 12, 1]]) {
                for (let row = 0; row < 4; row++) {
                    const y = 76 + row * 9;
                    ctx.fillStyle = '#6e6e7c';
                    ctx.fillRect(kx, y, 3, 3);
                    ctx.fillStyle = '#3a3a46';
                    ctx.fillRect(kx + 1, y + 3, 2, 1);
                    // EQ knobs turning slowly as the mix moves.
                    const turn = row === 1 + ch ? Math.sin(t * 0.3 + ch * 2) * 2.4 : (row - 1.5) * 0.6;
                    const ix = Math.round(Math.sin(turn) * 1.4), iy = Math.round(-Math.cos(turn) * 1.4);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(kx + 1 + ix, y + 1 + iy, 1, 1);
                }
            }
            const jitter = (k: number) => (hash(Math.floor(t * 15), k) - 0.5) * 0.12;
            meter(ctx, cx - 4, Math.min(1, 0.45 + 0.45 * kick + jitter(1)));
            meter(ctx, cx + 1, Math.min(1, (0.45 + 0.45 * pulse(beat + 0.02) + jitter(2)) * (0.3 + 0.7 * fadeB)));
            ctx.fillStyle = '#d8d8e4';
            ctx.fillRect(cx - 16, 121, 5, 3);
            ctx.fillRect(cx + 11, Math.round(141 - fadeB * 20), 5, 3);
            ctx.fillRect(Math.round(cx - 1 + Math.sin(t * 0.1) * 11), 148, 3, 5);
            ctx.fillStyle = css(light, 0.9);
            ctx.fillRect(cx - 16, 122, 5, 1);

            // The waveform display.
            ctx.fillStyle = '#05040a';
            ctx.fillRect(px0 - 2, py0 - 2, pw + 4, laneH * 2 + 7);
            ctx.fillStyle = '#2a2838';
            ctx.fillRect(px0 - 2, py0 - 2, pw + 4, 1);
            drawWave(ctx, waves[0].canvas, beat * PX, py0);
            drawWave(ctx, waves[1].canvas, beat * PX + PX * 20, py0 + laneH + 2);
            ctx.fillStyle = 'rgba(5,4,10,0.45)';
            ctx.fillRect(px0, py0, Math.floor(pw / 2), laneH * 2 + 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px0 + Math.floor(pw / 2), py0 - 1, 1, laneH * 2 + 4);

            // Club lights sweep across the booth and the front edge glows.
            ctx.globalCompositeOperation = 'lighter';
            const sx = cx + Math.sin(t * 0.6) * W * 0.45;
            const spot = ctx.createRadialGradient(sx, 110, 2, sx, 110, 70);
            spot.addColorStop(0, css(light, 0.16 + 0.08 * kick));
            spot.addColorStop(1, css(light, 0));
            ctx.fillStyle = spot;
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = css(light, 0.35 + 0.4 * kick);
            ctx.fillRect(0, H - 6, W, 1);
            ctx.fillStyle = css(light, 0.12 + 0.15 * kick);
            ctx.fillRect(0, H - 9, W, 3);
            ctx.fillRect(0, H - 5, W, 5);
            ctx.globalCompositeOperation = 'source-over';
        };
    }
};
