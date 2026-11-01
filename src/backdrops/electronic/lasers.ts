import {Backdrop, bayer, css, hex, pixels, pulse, RGB, rng, wrappingNoise} from '../pixel';

/**
 * A club seen from the back of the room: laser fans sweeping through drifting
 * haze over a crowd bouncing on the beat. The pattern changes every 8 bars.
 */
export const LASERS: Backdrop = {
    id: 'lasers',
    name: 'Laser club',
    bpm: 124,
    create(W, H) {
        const random = rng(31);
        const colours: Array<[RGB, RGB]> = [
            [hex('#ff2a6d'), hex('#05d9e8')],
            [hex('#39ff14'), hex('#7b2fff')],
            [hex('#05d9e8'), hex('#f9f871')],
            [hex('#ff6ec7'), hex('#7df9ff')]
        ];

        // Haze: dithered noise, denser towards the floor, scrolled sideways.
        const big = wrappingNoise(W, H, 28, random);
        const small = wrappingNoise(W, H, 9, random);
        const haze = pixels(W, H, put => {
            const c = hex('#b9a8ff');
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const v = (big(x, y) * 0.7 + small(x, y) * 0.3) * (0.35 + 0.65 * (y / H));
                    if (v > 0.25 + bayer(x, y) * 0.5) put(x, y, c, 255);
                }
            }
        });

        const emitters = [0.12, 0.5, 0.88].map((f, i) => ({x: W * f, y: 4, phase: i * 2.1}));

        const crowdTop = Math.round(H * 0.8);
        const crowd = Array.from({length: Math.ceil(W / 6) + 2}, (_, i) => ({
            x: i * 6 - 4 + Math.floor(random() * 3),
            y: crowdTop + Math.floor(random() * 8),
            phase: random() < 0.7 ? 0 : 0.5,
            arm: random() < 0.25 ? (random() < 0.5 ? -1 : 1) : 0,
            both: random() < 0.08
        }));

        const beams = (ctx: CanvasRenderingContext2D, x0: number, y0: number, angle: number, colour: RGB, strength: number) => {
            const len = H * 1.6;
            const x1 = x0 + Math.cos(angle) * len, y1 = y0 + Math.sin(angle) * len;
            ctx.strokeStyle = css(colour, 0.07 * strength);
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
            ctx.strokeStyle = css(colour, 0.55 * strength);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
        };

        return (ctx, t, beat) => {
            const kick = pulse(beat);
            const section = Math.floor(beat / 32);
            const mode = section % 3;
            const [a, b] = colours[section % colours.length];

            ctx.fillStyle = '#06030c';
            ctx.fillRect(0, 0, W, H);

            const floor = ctx.createLinearGradient(0, H * 0.55, 0, H);
            floor.addColorStop(0, 'rgba(0,0,0,0)');
            floor.addColorStop(1, css(a, 0.18 + 0.2 * kick));
            ctx.fillStyle = floor;
            ctx.fillRect(0, 0, W, H);

            ctx.globalCompositeOperation = 'lighter';
            const strength = 0.65 + 0.35 * kick;
            emitters.forEach((e, i) => {
                const colour = i === 1 ? b : a;
                for (let k = 0; k < 5; k++) {
                    const spread = (k - 2) * 0.16;
                    let angle: number;
                    if (mode === 0) angle = Math.PI / 2 + spread * 2 + Math.sin(t * 0.8 + e.phase) * 0.5;
                    else if (mode === 1) angle = Math.PI / 2 + spread + (i - 1) * -0.5 * Math.sin(t * 1.3) + Math.sin(t * 0.5) * 0.2;
                    else angle = Math.PI / 2 + Math.sin(t * 2 + k * 1.2 + e.phase) * 0.7;
                    beams(ctx, e.x, e.y, angle, colour, strength);
                }
                ctx.fillStyle = css(colour, 0.9);
                ctx.fillRect(Math.round(e.x) - 1, e.y - 1, 3, 2);
            });

            const drift = Math.floor(t * 3) % W;
            ctx.globalAlpha = 0.07 + 0.05 * kick;
            ctx.drawImage(haze.canvas, -drift, 0);
            ctx.drawImage(haze.canvas, W - drift, 0);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';

            // The crowd, black against the light, with a rim of laser colour.
            for (const p of crowd) {
                const bounce = Math.round(Math.max(0, Math.sin((beat + p.phase) * Math.PI * 2)) * 2);
                const y = p.y - bounce;
                ctx.fillStyle = '#000';
                ctx.fillRect(p.x + 1, y, 3, 4);
                ctx.fillRect(p.x, y + 4, 6, H - y);
                const sway = Math.round(Math.sin(t * 2 + p.x) * 1);
                if (p.arm !== 0 || p.both) {
                    const sides = p.both ? [-1, 1] : [p.arm];
                    for (const s of sides) {
                        const ax = s < 0 ? p.x - 1 : p.x + 6;
                        ctx.fillRect(ax + sway, y - 6, 1, 11);
                    }
                }
                ctx.fillStyle = css(a, 0.55);
                ctx.fillRect(p.x + 1, y, 3, 1);
            }

            // Every fourth bar in the strobe section, a short flash.
            if (mode === 2 && Math.floor(beat) % 16 === 0) {
                ctx.fillStyle = `rgba(255,255,255,${(0.18 * kick).toFixed(3)})`;
                ctx.fillRect(0, 0, W, H);
            }
        };
    }
};
