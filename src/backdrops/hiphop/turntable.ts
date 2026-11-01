import {Backdrop, css, ditherPick, hex, pixels, pulse, RGB} from '../pixel';
import {fillDisc} from './draw';

/**
 * A DJ's desk seen from above: a turntable spinning a record that a hand
 * grabs and scratches every other phrase, a mixer whose crossfader cuts on
 * the scratches, and a pad sampler lighting up in a drum pattern.
 */
export const TURNTABLE: Backdrop = {
    id: 'hiphop-turntable',
    name: 'Scratch deck',
    bpm: 92,
    create(W, H) {
        const R = 54;
        const deck = {w: 136, h: 150};
        const dx = Math.round(W / 2 - 28 - deck.w / 2), dy = Math.round((H - deck.h) / 2) + 2;
        const pc = {x: dx + 62, y: dy + 74};
        const mixer = {x: dx + deck.w + 5, y: dy + 4, w: 56, h: deck.h - 8};
        const pads = {x: dx - 50, y: dy + 46, cell: 9, gap: 2};

        // Desk, deck plinth, mixer and sampler bodies, platter rim and record.
        const table = ['#0d0a0c', '#171013', '#22161a', '#2e1e1f'].map(hex);
        const lampAt = {x: W * 0.45, y: H * 0.2};
        const base = pixels(W, H, put => {
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) {
                    const d = Math.hypot(x - lampAt.x, (y - lampAt.y) * 1.4) / (W * 0.7);
                    const grain = Math.sin(y * 0.9 + Math.sin(x * 0.05) * 3) * 0.05;
                    put(x, y, ditherPick(table, 1 - d + grain, x, y));
                }

            const box = (x0: number, y0: number, w: number, h: number, body: RGB, edge: RGB, dark: RGB) => {
                for (let y = 0; y < h; y++)
                    for (let x = 0; x < w; x++) {
                        const corner = (x < 2 || x >= w - 2) && (y < 2 || y >= h - 2) && !((x === 1 || x === w - 2) && (y === 1 || y === h - 2));
                        if (corner) continue;
                        put(x0 + x, y0 + y, x === 0 || y === 0 ? edge : x === w - 1 || y === h - 1 ? dark : body);
                    }
                for (let x = 2; x < w + 2; x++) put(x0 + x, y0 + h, hex('#050304'));
                for (let y = 2; y < h + 1; y++) put(x0 + w, y0 + y, hex('#050304'));
            };
            box(dx, dy, deck.w, deck.h, hex('#26252c'), hex('#4a4954'), hex('#141318'));
            box(mixer.x, mixer.y, mixer.w, mixer.h, hex('#1d1c22'), hex('#3c3b46'), hex('#0e0d12'));
            const pw = 4 * pads.cell + 3 * pads.gap + 8;
            box(pads.x - 4, pads.y - 4, pw, pw + 10, hex('#1d1c22'), hex('#3c3b46'), hex('#0e0d12'));

            // Platter rim.
            for (let y = -R - 4; y <= R + 4; y++)
                for (let x = -R - 4; x <= R + 4; x++) {
                    const r = Math.hypot(x, y);
                    if (r > R + 3.5) continue;
                    let c: RGB;
                    if (r > R + 0.5) c = ditherPick(['#3a3a44', '#6a6a78', '#a4a4b4'].map(hex), 0.5 - (x + y) / (R * 3), x, y);
                    else {
                        // Grooves, with the reflection of the desk lamp as two pale wedges.
                        const a = Math.atan2(y, x);
                        const sheen = Math.max(0, Math.cos((a + 2.2) * 2)) ** 6 * (r > 18 ? 1 : 0);
                        const groove = Math.floor(r) % 3 === 0 ? 0.12 : 0;
                        const band = r > 22 && r < 24 || r > 38 && r < 39.5 ? -0.1 : 0;
                        c = ditherPick(['#08080b', '#121218', '#1f1f28', '#3a3a48'].map(hex), groove + band + sheen * 0.8, x, y);
                    }
                    put(pc.x + x, pc.y + y, c);
                }

            // Start button, speed buttons, pitch fader track.
            for (let y = 0; y < 8; y++) for (let x = 0; x < 12; x++) put(dx + 6 + x, dy + deck.h - 14 + y, hex('#3c3b46'));
            for (const bxp of [dx + 22, dx + 30]) for (let y = 0; y < 3; y++) for (let x = 0; x < 6; x++) put(bxp + x, dy + deck.h - 10 + y, hex('#3c3b46'));
            for (let y = dy + 84; y < dy + deck.h - 12; y++) put(dx + deck.w - 10, y, hex('#08070a'));
            for (let y = dy + 84; y < dy + deck.h - 12; y += 4) put(dx + deck.w - 13, y, hex('#4a4954'));

            // Mixer: fader slots, knob holes, crossfader slot.
            for (const fx of [mixer.x + 14, mixer.x + mixer.w - 15])
                for (let y = mixer.y + 64; y < mixer.y + 110; y++) put(fx, y, hex('#060507'));
            for (let x = mixer.x + 10; x < mixer.x + mixer.w - 10; x++) put(x, mixer.y + mixer.h - 12, hex('#060507'));
        });

        // Tonearm drawn over the record.
        const pivot = {x: pc.x + R + 8, y: pc.y - R + 8};
        const needle = {x: pc.x + 30, y: pc.y - 28};
        const arm = pixels(W, H, put => {
            const silver = hex('#b8b8c6'), dim = hex('#6a6a78');
            fillShadowDisc(put, pivot.x, pivot.y, 7, hex('#3a3a44'));
            fillShadowDisc(put, pivot.x, pivot.y, 4, hex('#8a8a98'));
            const steps = 60;
            for (let i = 0; i <= steps; i++) {
                const s = i / steps;
                // A gentle S-bend from the pivot down to the headshell.
                const bend = Math.sin(s * Math.PI) * 6;
                const x = pivot.x + (needle.x - pivot.x) * s + bend * 0.6;
                const y = pivot.y + (needle.y - pivot.y) * s - bend * 0.3;
                put(x + 1, y + 1, hex('#050304'));
                put(x, y, silver);
                put(x, y + 1, dim);
            }
            for (let y = -3; y <= 3; y++) for (let x = -2; x <= 2; x++)
                put(pivot.x + 6 + x + Math.round(y * 0.4), pivot.y - 7 + y, y < -1 ? silver : dim);
            for (let y = -2; y <= 2; y++) for (let x = -3; x <= 3; x++) put(needle.x + x, needle.y + y + 1, y < 0 ? hex('#d8d8e4') : hex('#4a4954'));
        });

        // Which pads fire on which sixteenth: kick, snare, hats, a stab.
        // [sixteenth, row, column]: kick and snare on the bottom rows, hats and a chord run on top.
        const hits: Array<[number, number, number]> = [
            [0, 3, 0], [7, 3, 1], [10, 3, 0], [4, 2, 1], [12, 2, 2],
            [2, 1, 0], [6, 1, 1], [10, 1, 2], [14, 1, 3],
            [8, 0, 0], [9, 0, 1], [11, 0, 2], [13, 0, 3], [15, 2, 3]
        ];
        const padCols = ['#ff7a2f', '#ff4f9a', '#3fd0ff', '#3fe0a0'].map(hex);

        // The record plays for two bars, then gets scratched for two.
        const turnsPerBeat = 0.55 * 60 / 92;
        const recordAngle = (beat: number) => {
            const cycle = Math.floor(beat / 16), b = beat % 16;
            const played = cycle * 8 + Math.min(b, 8);
            let a = played * turnsPerBeat * Math.PI * 2;
            if (b >= 8) {
                const s = b - 8;
                a += 0.9 * Math.sin(s * Math.PI * 2) + 0.25 * Math.sin(s * Math.PI * 4);
            }
            return a;
        };

        return (ctx, t, beat) => {
            const kick = pulse(beat);
            const b = beat % 16;
            const scratching = b >= 8;
            const angle = recordAngle(beat);
            const step = Math.floor(beat * 4) % 16;
            const frac = beat * 4 - Math.floor(beat * 4);

            ctx.drawImage(base.canvas, 0, 0);

            // Strobe dots on the platter rim, the surest sign it is turning.
            ctx.fillStyle = '#d0d0dc';
            for (let k = 0; k < 40; k++) {
                const a = angle + k * Math.PI * 2 / 40;
                ctx.fillRect(Math.round(pc.x + Math.cos(a) * (R + 2)), Math.round(pc.y + Math.sin(a) * (R + 2)), 1, 1);
            }

            // Label, painted per pixel so its design turns with the record.
            const LR = 16;
            for (let y = -LR; y <= LR; y++)
                for (let x = -LR; x <= LR; x++) {
                    const r = Math.hypot(x, y);
                    if (r > LR + 0.3) continue;
                    const a = Math.atan2(y, x) - angle;
                    const u = Math.cos(a) * r, v = Math.sin(a) * r;
                    let c = '#d8473f';
                    if (r < 1.5) c = '#c8c8d4';
                    else if (Math.abs(v) < 2.5 && u > 3) c = '#f2e6c8';
                    else if (Math.abs(u + 9) < 3 && Math.abs(v) < 3) c = '#1a1420';
                    else if (r > LR - 1.5) c = '#a8322e';
                    ctx.fillStyle = c;
                    ctx.fillRect(pc.x + x, pc.y + y, 1, 1);
                }
            // A cue sticker near the edge.
            ctx.fillStyle = '#f2f2f8';
            for (let r = 30; r < 46; r++) {
                ctx.fillRect(Math.round(pc.x + Math.cos(angle + 0.6) * r), Math.round(pc.y + Math.sin(angle + 0.6) * r), 1, 1);
                ctx.fillRect(Math.round(pc.x + Math.cos(angle + 0.63) * r), Math.round(pc.y + Math.sin(angle + 0.63) * r), 1, 1);
            }

            ctx.drawImage(arm.canvas, 0, 0);

            // The hand rides the record while scratching.
            if (scratching) {
                const s = b - 8;
                const off = 0.9 * Math.sin(s * Math.PI * 2) + 0.25 * Math.sin(s * Math.PI * 4);
                const ha = 2.2 + off * 0.5;
                const hx = pc.x + Math.cos(ha) * (R - 14), hy = pc.y + Math.sin(ha) * (R - 14);
                const fade = Math.min(1, s * 4, (8 - s) * 4);
                drawHand(ctx, Math.round(hx), Math.round(hy + (1 - fade) * 70), H);
            }

            // Start button glow and pitch fader cap.
            ctx.fillStyle = '#ff3b3b';
            ctx.fillRect(dx + 8, dy + deck.h - 12, 2, 1);
            ctx.fillStyle = '#9a9aa8';
            ctx.fillRect(dx + deck.w - 13, dy + 110 + Math.round(Math.sin(t * 0.2) * 3), 7, 3);

            // Mixer: VU meters, EQ knobs, channel faders, crossfader.
            for (let ch = 0; ch < 2; ch++) {
                const level = scratching && ch === 0
                    ? 0.4 + 0.6 * Math.abs(Math.sin((b - 8) * Math.PI * 2))
                    : 0.35 + 0.55 * kick + 0.1 * Math.sin(t * 9 + ch);
                for (let i = 0; i < 10; i++) {
                    const on = i < level * 10;
                    const c = i > 7 ? [255, 79, 106] : i > 5 ? [255, 210, 74] : [63, 224, 160];
                    ctx.fillStyle = css(c as RGB, on ? 1 : 0.15);
                    ctx.fillRect(mixer.x + 25 + ch * 5, mixer.y + 58 - i * 4, 3, 3);
                }
                const fx = ch === 0 ? mixer.x + 14 : mixer.x + mixer.w - 15;
                for (let k = 0; k < 3; k++) {
                    const ky = mixer.y + 12 + k * 15;
                    ctx.fillStyle = '#3c3b46';
                    fillDisc(ctx, fx, ky, 4);
                    ctx.fillStyle = '#121117';
                    fillDisc(ctx, fx, ky, 3);
                    const ka = -2.2 + (k * 0.9 + ch * 0.5) + Math.sin(t * 0.15 + k + ch) * 0.4;
                    ctx.fillStyle = '#e8e8f0';
                    ctx.fillRect(Math.round(fx + Math.cos(ka) * 2), Math.round(ky + Math.sin(ka) * 2), 1, 1);
                }
                ctx.fillStyle = '#b8b8c6';
                ctx.fillRect(fx - 3, mixer.y + 74 + ch * 6, 7, 4);
                ctx.fillStyle = '#5a5a66';
                ctx.fillRect(fx - 3, mixer.y + 76 + ch * 6, 7, 1);
            }
            // The crossfader cuts in sixteenths while scratching, rests otherwise.
            let cf = 0.5;
            if (scratching) cf = [0, 2, 3, 6, 8, 10, 11, 14].includes(step) ? 0 : 0.5;
            const cfx = Math.round(mixer.x + 10 + cf * (mixer.w - 26));
            ctx.fillStyle = '#d8d8e4';
            ctx.fillRect(cfx, mixer.y + mixer.h - 15, 6, 6);
            ctx.fillStyle = '#7a7a88';
            ctx.fillRect(cfx, mixer.y + mixer.h - 12, 6, 1);

            // Sampler pads.
            ctx.globalCompositeOperation = 'source-over';
            for (let r = 0; r < 4; r++)
                for (let c = 0; c < 4; c++) {
                    const x = pads.x + c * (pads.cell + pads.gap), y = pads.y + r * (pads.cell + pads.gap);
                    let glow = 0;
                    for (const [hs, hr, hc] of hits) {
                        if (hr !== r || hc !== c) continue;
                        if (hs === step) glow = Math.max(glow, Math.pow(1 - frac, 1.5));
                        // Pads that fired a sixteenth ago are still fading.
                        if (hs === (step + 15) % 16) glow = Math.max(glow, 0.35 * (1 - frac));
                    }
                    const col = padCols[r];
                    ctx.fillStyle = css(col, 0.18 + 0.82 * glow);
                    ctx.fillRect(x, y, pads.cell, pads.cell);
                    ctx.fillStyle = css([255, 255, 255], 0.08 + 0.4 * glow);
                    ctx.fillRect(x, y, pads.cell, 1);
                    if (glow > 0.3) {
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.fillStyle = css(col, 0.12 * glow);
                        ctx.fillRect(x - 3, y - 3, pads.cell + 6, pads.cell + 6);
                        ctx.globalCompositeOperation = 'source-over';
                    }
                }
            // A little screen above the pads, with a waveform crawling across it.
            ctx.fillStyle = '#0a1418';
            const sw = 4 * pads.cell + 3 * pads.gap;
            ctx.fillRect(pads.x, pads.y + sw + 1, sw, 4);
            ctx.fillStyle = '#3fd0ff';
            for (let x = 0; x < sw; x++) {
                const v = Math.abs(Math.sin((x + t * 20) * 0.5) * Math.sin((x + t * 20) * 0.13));
                ctx.fillRect(pads.x + x, pads.y + sw + 3 - Math.round(v * 1.5), 1, 1 + Math.round(v * 2));
            }

            // The lamp above breathes faintly with the kick.
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = `rgba(255,170,110,${(0.02 + 0.025 * kick).toFixed(3)})`;
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = 'source-over';
        };
    }
};

function fillShadowDisc(put: (x: number, y: number, c: RGB) => void, cx: number, cy: number, r: number, c: RGB) {
    for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++)
            if (x * x + y * y <= r * r + r * 0.6) put(cx + x, cy + y, c);
}

/** A hand flat on the record, fingers forward, with the sleeve running off the bottom. */
function drawHand(ctx: CanvasRenderingContext2D, x: number, y: number, H: number) {
    const skin = '#8a5a40', shade = '#5e3a2a', light = '#b98260';
    // Forearm in a dark sleeve, angled down-left out of frame.
    for (let j = 6; j < H - y + 2; j++) {
        const cx = x - 2 - Math.round(j * 0.45);
        const w = 9 + Math.round(j * 0.12);
        ctx.fillStyle = j < 12 ? skin : '#231d33';
        ctx.fillRect(cx - (w >> 1), y + j, w, 1);
        ctx.fillStyle = j < 12 ? shade : '#151122';
        ctx.fillRect(cx + (w >> 1) - 1, y + j, 2, 1);
        if (j === 12) { ctx.fillStyle = '#3a3152'; ctx.fillRect(cx - (w >> 1), y + j, w, 2); }
    }
    // Palm.
    ctx.fillStyle = skin;
    ctx.fillRect(x - 5, y - 3, 11, 10);
    ctx.fillRect(x - 4, y - 4, 9, 1);
    ctx.fillStyle = shade;
    ctx.fillRect(x + 5, y - 3, 1, 10);
    ctx.fillRect(x - 5, y + 6, 11, 1);
    // Fingers.
    [6, 8, 8, 6].forEach((len, i) => {
        const fx = x - 5 + i * 3;
        ctx.fillStyle = skin;
        ctx.fillRect(fx, y - 3 - len, 2, len);
        ctx.fillStyle = light;
        ctx.fillRect(fx, y - 3 - len, 1, len - 1);
    });
    // Thumb, out to the left.
    ctx.fillStyle = skin;
    ctx.fillRect(x - 9, y, 4, 2);
    ctx.fillRect(x - 11, y - 2, 3, 2);
    ctx.fillStyle = light;
    ctx.fillRect(x - 11, y - 2, 3, 1);
    ctx.fillRect(x - 4, y - 3, 8, 1);
}
