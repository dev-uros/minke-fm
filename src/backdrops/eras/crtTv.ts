import {Backdrop, canvas, css, ditherPick, hex, pixels, pulse, RGB, rng, wrappingNoise} from '../pixel';
import {ellipse, line} from './draw';

/**
 * A wooden console TV in a dark wood-panelled den, rabbit ears on top. It flips
 * channels: colour bars, a burst of snow, a sunset-over-the-sea programme that
 * rolls before the picture holds. Whatever is on lights the room in its colour.
 */
export const CRT_TV: Backdrop = {
    id: 'eras-crt-tv',
    name: 'Console TV',
    bpm: 104,
    create(W, H) {
        const random = rng(57);
        const cx = Math.round(W / 2);
        const floorY = 150;
        const cab = {x: cx - 78, y: 58, w: 156, h: 88};
        const scr = {x: cab.x + 9, y: cab.y + 9, w: 102, h: 70};
        const tvCentre = {x: scr.x + scr.w / 2, y: scr.y + scr.h / 2};

        const wallPal = ['#06050a', '#0b0a12', '#13111a', '#1d1922', '#2a242c'].map(hex);
        const floorPal = ['#060407', '#0e090b', '#1a1113', '#2a1b1a'].map(hex);
        const fuzz = wrappingNoise(W, H, 3, random);

        const room = pixels(W, H, put => {
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const d = Math.hypot(x - tvCentre.x, (y - tvCentre.y) * 1.3) / (W * 0.7);
                    if (y < floorY) {
                        const groove = x % 16 === 0 ? -0.25 : x % 16 === 1 ? 0.06 : 0;
                        put(x, y, ditherPick(wallPal, 0.9 - d + groove, x, y));
                    } else {
                        const shag = fuzz(x, y * 2) * 0.35;
                        put(x, y, ditherPick(floorPal, 0.85 - d * 1.1 + shag, x, y));
                    }
                }
            }
        });
        const r = room.ctx;
        r.fillStyle = '#100b0c';
        r.fillRect(0, floorY - 4, W, 4);
        r.fillStyle = '#241a1a';
        r.fillRect(0, floorY - 4, W, 1);

        // Cabinet: walnut box on peg legs, bevelled edge.
        const walnut = ['#1c0e08', '#2c160b', '#3e2010', '#552c15'].map(hex);
        for (let y = cab.y; y < cab.y + cab.h; y++) {
            for (let x = cab.x; x < cab.x + cab.w; x++) {
                const v = 0.45 + (fuzz(x * 0.2, y * 1.5) - 0.5) * 0.4 - (y - cab.y) / cab.h * 0.2;
                r.fillStyle = css(ditherPick(walnut, v, x, y));
                r.fillRect(x, y, 1, 1);
            }
        }
        r.fillStyle = '#7a4524';
        r.fillRect(cab.x, cab.y, cab.w, 1);
        r.fillStyle = '#0e0704';
        r.fillRect(cab.x, cab.y + cab.h - 1, cab.w, 2);
        r.fillStyle = '#1a0d07';
        for (const lx of [cab.x + 8, cab.x + cab.w - 12]) {
            line(r, lx, cab.y + cab.h, lx - (lx < cx ? 2 : -2), floorY + 2, 3);
        }
        // Bezel around the tube.
        r.fillStyle = '#16100c';
        r.fillRect(scr.x - 4, scr.y - 4, scr.w + 8, scr.h + 8);
        r.fillStyle = '#8a8076';
        r.fillRect(scr.x - 4, scr.y - 4, scr.w + 8, 1);
        r.fillRect(scr.x - 4, scr.y - 4, 1, scr.h + 8);
        // Control panel: two dials and a grille.
        const panelX = scr.x + scr.w + 7;
        const panelW = cab.x + cab.w - panelX - 6;
        r.fillStyle = '#1a0f09';
        r.fillRect(panelX, scr.y - 3, panelW, scr.h + 6);
        for (const [dy, rad] of [[12, 7], [32, 5]] as const) {
            r.fillStyle = '#0c0806';
            ellipse(r, panelX + panelW / 2, scr.y + dy + 1, rad, rad);
            r.fillStyle = '#a8a098';
            ellipse(r, panelX + panelW / 2, scr.y + dy, rad, rad);
            r.fillStyle = '#d8d0c4';
            ellipse(r, panelX + panelW / 2 - 1, scr.y + dy - 1, rad - 3, rad - 3);
            r.fillStyle = '#3a3430';
            r.fillRect(Math.round(panelX + panelW / 2), scr.y + dy - rad + 1, 1, rad);
        }
        r.fillStyle = '#0b0705';
        for (let gy = scr.y + 44; gy < scr.y + scr.h; gy += 3) r.fillRect(panelX + 3, gy, panelW - 6, 1);

        // Rabbit ears.
        const ant = {x: cx - 10, y: cab.y - 4};
        r.fillStyle = '#2a2624';
        ellipse(r, ant.x, ant.y + 1, 7, 3);
        r.fillStyle = '#5a5450';
        ellipse(r, ant.x, ant.y, 6, 2);
        r.fillStyle = '#9c968e';
        line(r, ant.x - 1, ant.y - 2, ant.x - 30, ant.y - 44);
        line(r, ant.x + 1, ant.y - 2, ant.x + 24, ant.y - 48);
        r.fillRect(ant.x - 31, ant.y - 45, 2, 2);
        r.fillRect(ant.x + 24, ant.y - 49, 2, 2);

        // A rubber plant at the left, only its outline catches the TV light.
        const plant = {x: cab.x - 26, y: floorY + 4};
        r.fillStyle = '#2a1712';
        r.fillRect(plant.x - 6, plant.y - 12, 13, 12);
        r.fillStyle = '#3a2018';
        r.fillRect(plant.x - 7, plant.y - 13, 15, 2);
        for (let i = 0; i < 9; i++) {
            const a = -Math.PI / 2 + (random() - 0.5) * 2.2;
            const len = 18 + random() * 30;
            const ex = plant.x + Math.cos(a) * len, ey = plant.y - 13 + Math.sin(a) * len;
            r.fillStyle = '#1e3424';
            line(r, plant.x, plant.y - 13, ex, ey);
            r.fillStyle = i % 2 ? '#16251a' : '#1c3022';
            ellipse(r, ex, ey, 4, 2);
            r.fillStyle = '#2c4a32';
            r.fillRect(Math.round(ex) + 1, Math.round(ey) - 2, 3, 1);
        }

        // Screen furniture: scanlines and rounded tube corners, precomputed.
        const scan = pixels(scr.w, scr.h, put => {
            for (let y = 1; y < scr.h; y += 2) for (let x = 0; x < scr.w; x++) put(x, y, [0, 0, 0], 70);
        });
        const corners = pixels(scr.w, scr.h, put => {
            const rad = 9;
            for (let y = 0; y < scr.h; y++) {
                for (let x = 0; x < scr.w; x++) {
                    const dx = Math.max(0, rad - x, x - (scr.w - 1 - rad));
                    const dy = Math.max(0, rad - y, y - (scr.h - 1 - rad));
                    const d = Math.hypot(dx, dy);
                    if (d > rad) put(x, y, hex('#16100c'));
                    else {
                        // Darken towards the edge of the tube.
                        const e = Math.min(x, y, scr.w - 1 - x, scr.h - 1 - y);
                        if (e < 4) put(x, y, [0, 0, 0], 110 - e * 25);
                    }
                }
            }
            for (let i = 0; i < 14; i++) put(8 + i, 4, [255, 255, 255], 60);
            for (let i = 0; i < 6; i++) put(5, 7 + i, [255, 255, 255], 50);
        });

        // Four frames of snow, cycled.
        const snow = Array.from({length: 4}, () => pixels(scr.w, scr.h * 2, put => {
            for (let y = 0; y < scr.h * 2; y++) {
                for (let x = 0; x < scr.w; x++) {
                    const v = Math.pow(random(), 1.5) * 220 + 20;
                    put(x, y, [v * 0.95, v * 0.97, v]);
                }
            }
        }));

        // Colour bars test card.
        const bars = canvas(scr.w, scr.h);
        {
            const b = bars.ctx;
            const top = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
            const mid = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'];
            const bw = scr.w / 7;
            top.forEach((c, i) => {
                b.fillStyle = c;
                b.fillRect(Math.round(i * bw), 0, Math.ceil(bw), Math.round(scr.h * 0.67));
            });
            mid.forEach((c, i) => {
                b.fillStyle = c;
                b.fillRect(Math.round(i * bw), Math.round(scr.h * 0.67), Math.ceil(bw), Math.round(scr.h * 0.08));
            });
            const low = ['#00214c', '#ffffff', '#32006a', '#131313', '#090909', '#131313', '#1d1d1d'];
            low.forEach((c, i) => {
                b.fillStyle = c;
                b.fillRect(Math.round(i * bw), Math.round(scr.h * 0.75), Math.ceil(bw), scr.h);
            });
        }

        // The sunset programme, drawn into its own canvas per frame.
        const prog = canvas(scr.w, scr.h);
        const sky: RGB[] = ['#2a1050', '#6a1f62', '#c23d5c', '#f07a4a', '#ffc066'].map(hex);
        const sunsetSky = pixels(scr.w, scr.h, put => {
            const hz = Math.round(scr.h * 0.6);
            for (let y = 0; y < hz; y++) for (let x = 0; x < scr.w; x++) put(x, y, ditherPick(sky, y / hz, x, y));
            for (let y = hz; y < scr.h; y++) {
                for (let x = 0; x < scr.w; x++) put(x, y, ditherPick(['#1a0c30', '#3a1648', '#6a2450'].map(hex), 1 - (y - hz) / (scr.h - hz), x, y));
            }
        });
        const drawSunset = (t: number, b: number) => {
            const p = prog.ctx;
            const hz = Math.round(scr.h * 0.6);
            p.drawImage(sunsetSky.canvas, 0, 0);
            const sr = 13 + Math.round(b);
            p.fillStyle = '#ffd27a';
            for (let y = -sr; y <= 0; y++) {
                const half = Math.round(Math.sqrt(sr * sr - y * y));
                if (y > -6 && (y + Math.floor(t * 3)) % 3 === 0) continue;
                p.fillRect(scr.w / 2 - half, hz + y - 2, half * 2, 1);
            }
            // Sun's reflection broken by waves.
            for (let y = hz; y < scr.h; y += 2) {
                const k = (y - hz) / (scr.h - hz);
                const half = Math.round((1 - k) * 12 + 2 + Math.sin(t * 3 + y) * 3);
                p.fillStyle = `rgba(255,190,110,${(0.75 - k * 0.5).toFixed(3)})`;
                p.fillRect(Math.round(scr.w / 2 - half + Math.sin(t * 2 + y * 0.7) * 2), y, half * 2, 1);
            }
            // A sailboat drifting across.
            const bx = Math.round(((t * 4) % (scr.w + 30)) - 15), by = hz - 1 + Math.round(Math.sin(t * 2));
            p.fillStyle = '#1a0a24';
            p.fillRect(bx, by, 10, 2);
            p.fillRect(bx + 1, by + 2, 8, 1);
            p.fillRect(bx + 5, by - 12, 1, 12);
            for (let i = 0; i < 10; i++) p.fillRect(bx + 6, by - 11 + i, Math.ceil(i * 0.5), 1);
            for (let i = 0; i < 7; i++) p.fillRect(bx + 4 - Math.ceil(i * 0.4), by - 8 + i, Math.ceil(i * 0.4), 1);
        };

        // Channel schedule: [what, seconds]. 'roll' is the sunset slipping vertically.
        const schedule: Array<['bars' | 'snow' | 'roll' | 'sunset', number]> = [
            ['bars', 7], ['snow', 1.2], ['roll', 2.5], ['sunset', 10], ['snow', 0.8]
        ];
        const cycle = schedule.reduce((s, [, d]) => s + d, 0);
        const tint: Record<string, RGB> = {
            bars: hex('#8aa0d0'), snow: hex('#a8b0c8'), roll: hex('#e07a5a'), sunset: hex('#f08a5a')
        };

        return (ctx, t, beat) => {
            const b = pulse(beat);
            ctx.drawImage(room.canvas, 0, 0);

            let tt = t % cycle;
            let what: string = 'bars', local = 0;
            for (const [w, d] of schedule) {
                if (tt < d) {
                    what = w;
                    local = tt;
                    break;
                }
                tt -= d;
            }

            ctx.save();
            ctx.beginPath();
            ctx.rect(scr.x, scr.y, scr.w, scr.h);
            ctx.clip();
            if (what === 'bars') {
                ctx.drawImage(bars.canvas, scr.x, scr.y);
            } else if (what === 'snow') {
                const f = snow[Math.floor(t * 30) % 4];
                ctx.drawImage(f.canvas, 0, Math.floor(random() * scr.h), scr.w, scr.h, scr.x, scr.y, scr.w, scr.h);
            } else {
                drawSunset(t, b);
                // Vertical hold: rolls fast then settles; 'sunset' is held steady.
                const off = what === 'roll' ? Math.round(Math.pow(1 - local / 2.5, 2) * scr.h * 3) % (scr.h + 6) : 0;
                ctx.fillStyle = '#050305';
                ctx.fillRect(scr.x, scr.y, scr.w, scr.h);
                ctx.drawImage(prog.canvas, scr.x, scr.y + off);
                ctx.drawImage(prog.canvas, scr.x, scr.y + off - scr.h - 6);
            }
            // A faint interference band crawling up the tube.
            const band = Math.round(scr.y + scr.h - ((t * 14) % (scr.h + 20)));
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(scr.x, band, scr.w, 6);
            ctx.restore();
            ctx.drawImage(scan.canvas, scr.x, scr.y);
            ctx.drawImage(corners.canvas, scr.x, scr.y);

            // The tube lights the room in whatever colour it shows.
            const c = tint[what];
            const flicker = what === 'snow' ? 0.04 * Math.sin(t * 50) : 0;
            const g = ctx.createRadialGradient(tvCentre.x, tvCentre.y + 10, 10, tvCentre.x, tvCentre.y + 10, W * 0.6);
            g.addColorStop(0, css(c, 1));
            g.addColorStop(1, css(c, 0));
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.16 + 0.04 * b + flicker;
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';

            // A pool of the same light on the carpet.
            ctx.fillStyle = css(c, 0.07 + 0.03 * b);
            ellipse(ctx, tvCentre.x, floorY + 14, 70, 9);
        };
    }
};
