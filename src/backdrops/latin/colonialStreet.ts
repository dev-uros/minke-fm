import {Backdrop, bayer, css, ditherPick, hash, hex, pixels, pulse, RGB, rng} from '../pixel';
import {mix, shade} from './draw';

/**
 * An old colonial street at golden hour: pastel houses with tall shuttered
 * doors and iron balconies, a rounded two-tone 1950s car parked at the kerb,
 * palm-frond shadows swaying on the walls, warm haze drifting in the low sun,
 * and a few birds crossing the strip of sky.
 */
export const COLONIAL_STREET: Backdrop = {
    id: 'latin-colonial-street',
    name: 'Golden hour street',
    bpm: 96,
    create(W, H) {
        const random = rng(29);
        const walk = 136, kerb = 142;
        const sky: RGB[] = ['#4a3a7a', '#a0507a', '#e8806a', '#ffb878', '#ffd89a'].map(hex);
        const paints = ['#8fd3c0', '#f4b38a', '#9cc4ec', '#f2dc84', '#c8a4e0', '#f29aa4', '#a8dc9a'].map(hex);
        const trim = hex('#fff2dc');
        const wood = ['#2f5a6a', '#6a3a2a', '#3a6a4a', '#7a5a2a'].map(hex);

        // Lay out house fronts across the width, centred so any W looks balanced.
        type House = {x0: number; x1: number; top: number; paint: RGB; wood: RGB; floors: number};
        const houses: House[] = [];
        {
            const widths: number[] = [];
            let total = 0;
            while (total < W + 80) {
                const w = 52 + Math.floor(random() * 30);
                widths.push(w);
                total += w;
            }
            let x = Math.round(W / 2 - total / 2);
            let last = -1;
            for (const w of widths) {
                let p = Math.floor(random() * paints.length);
                if (p === last) p = (p + 2) % paints.length;
                last = p;
                houses.push({x0: x, x1: x + w, top: 22 + Math.floor(random() * 18), paint: paints[p],
                    wood: wood[Math.floor(random() * wood.length)], floors: random() < 0.75 ? 2 : 1});
                x += w;
            }
        }

        const scene = pixels(W, H, put => {
            // Sky.
            for (let y = 0; y < 60; y++) for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, y / 52, x, y));
            // Facades.
            for (const h of houses) {
                const w = h.x1 - h.x0;
                const doors = w > 64 ? 3 : 2;
                const slot = w / doors;
                for (let y = h.top; y < walk; y++) {
                    for (let x = Math.max(0, h.x0); x < Math.min(W, h.x1); x++) {
                        const lx = x - h.x0;
                        const sun = 0.82 + 0.18 * (lx / w);       // low sun from the right
                        let c: RGB = h.paint;
                        let lit = true;
                        // Openings: tall arched doors below, shuttered windows above.
                        const k = Math.floor(lx / slot);
                        const ox = lx - k * slot - slot / 2;
                        const upperTop = h.top + 14, upperBot = h.top + 36;
                        const doorTop = walk - 40;
                        const archR = 5;
                        const inDoor = Math.abs(ox) <= archR &&
                            (y >= doorTop + archR || (y >= doorTop && Math.hypot(ox, y - doorTop - archR) <= archR));
                        const inWin = h.floors === 2 && Math.abs(ox) <= 4 && y >= upperTop && y <= upperBot;
                        if (inDoor) {
                            const louvre = (y % 2 === 0) ? 0.82 : 1;
                            c = Math.abs(ox) < 0.6 ? shade(h.wood, 0.5) : shade(h.wood, louvre);
                            if (y > walk - 4) c = hex('#c8b8a0');
                        } else if (inWin) {
                            c = (y % 2 === 0) ? shade(h.wood, 0.8) : h.wood;
                            if (Math.abs(ox) < 0.6) c = shade(h.wood, 0.5);
                        } else if (Math.abs(ox) <= archR + 1 && y >= doorTop - 1 && (y >= doorTop + archR || Math.hypot(ox, y - doorTop - archR) <= archR + 1.5)) {
                            c = trim;
                        } else if (h.floors === 2 && Math.abs(ox) <= 5 && y >= upperTop - 2 && y <= upperBot + 1) {
                            c = trim;
                        } else if (y < h.top + 4) {
                            c = y === h.top ? hex('#c0603a') : trim;              // tile edge and cornice
                        } else if (y >= walk - 6) {
                            c = shade(h.paint, 0.78);                              // plinth
                        } else if (h.floors === 1 && y >= h.top + 6 && y <= h.top + 13) {
                            // Balustraded parapet on the single-storey houses.
                            c = (y === h.top + 6 || y === h.top + 13 || lx % 4 === 0) ? trim : shade(h.paint, 0.7);
                        } else if (h.floors === 2 && y >= upperBot + 4 && y <= upperBot + 6) {
                            c = trim;                                              // string course
                        }
                        // Iron balcony on each upper window, and its long shadow.
                        if (h.floors === 2 && Math.abs(ox) <= 7) {
                            if (y === upperBot + 1 || y === upperBot - 6) { c = hex('#1e1a20'); lit = false; }
                            else if (y > upperBot - 6 && y <= upperBot && (Math.floor(ox) & 1)) { c = hex('#1e1a20'); lit = false; }
                        }
                        if (h.floors === 2 && ox > -9 && ox < 5 && y > upperBot + 1 && y < upperBot + 9 && !inDoor && c !== trim) {
                            if (ox - (y - upperBot) * 0.6 < -3) c = shade(c, 0.72);
                        }
                        if (lx === 0 || lx === w - 1) c = shade(c, 0.75);
                        put(x, y, lit ? shade(c, sun + (bayer(x, y) - 0.5) * 0.06) : c);
                    }
                }
            }
            // Pavement, kerb and the road.
            for (let y = walk; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    let c: RGB;
                    if (y < kerb) c = ((x + (y - walk) * 3) % 12 === 0 || y === walk) ? hex('#a08070') : hex('#d0a888');
                    else if (y < kerb + 2) c = y === kerb ? hex('#f0d0a8') : hex('#8a6a5a');
                    else {
                        const row = Math.floor((y - kerb) / 4);
                        const cob = (x + row * 3) % 7 === 0 || (y - kerb) % 4 === 0;
                        const v = 0.75 + hash(Math.floor((x + row * 3) / 7), row) * 0.2 + (y - kerb) / 140;
                        c = shade(cob ? hex('#7a5a54') : hex('#b08670'), v);
                    }
                    put(x, y, c);
                }
            }
        });

        // A rounded two-tone sedan, nose to the right.
        const car = pixels(96, 36, put => {
            const body = hex('#3fb2ac'), cream = hex('#f6ead0'), glass = hex('#2a3448'), chrome = hex('#f4f0e8');
            const wheels = [20, 74];
            for (let y = 0; y < 36; y++) {
                for (let x = 0; x < 96; x++) {
                    // Silhouette: rounded boot, glasshouse, long hood, round nose.
                    let top: number;
                    if (x < 24) top = 13 + Math.round(Math.pow((24 - x) / 24, 2) * 4);
                    else if (x < 34) top = 13 - Math.round((x - 24) * 1.05);
                    else if (x < 56) top = 2 + Math.round(Math.pow((x - 45) / 11, 2) * 1.5);
                    else if (x < 64) top = 3 + Math.round((x - 56) * 1.2);
                    else top = 13 + Math.round(Math.pow(Math.max(0, x - 80) / 15, 2) * 8);
                    // Fenders bulge over the front wheel.
                    if (x > 64 && x < 86) top = Math.min(top, 12 - Math.round(Math.sin(((x - 64) / 22) * Math.PI) * 1.5));
                    let bottom = 29;
                    if (x < 4) bottom = 27;
                    if (x > 91) bottom = 27 - (x - 91);
                    if (y < top || y > bottom) continue;
                    let c: RGB = y < 13 ? cream : body;
                    // Windows.
                    if (y >= top + 2 && y <= 12 && x > 27 && x < 62 && x !== 46 && x !== 47) {
                        c = glass;
                        if ((x + y) % 9 === 0 || (x + y) % 9 === 1) c = hex('#a8b8d0');
                    }
                    // A cream sweep along the flank, edged in chrome.
                    const spear = 18 + Math.round((x - 30) / 30);
                    if (x > 26 && x < 88 && y >= spear && y <= spear + 2) c = cream;
                    if (x > 26 && x < 88 && y === spear - 1) c = chrome;
                    if (x < 3 && y > 20) c = chrome;
                    if (x > 90 && y > 20) c = chrome;
                    if (x >= 91 && y >= 15 && y <= 17) c = hex('#fff6c0');
                    if (x <= 2 && y >= 15 && y <= 18) c = hex('#e03a3a');
                    // Front wheel arch is open; the rear wears a skirt.
                    if (Math.hypot(x - wheels[1], y - 29) < 9 && y > 22) c = hex('#1a1416');
                    const light = y < 13 ? 1.05 - (y - top) * 0.012 : 1.02 - (y - 13) * 0.02;
                    put(x, y, shade(c, light + (x / 96) * 0.08));
                }
            }
            wheels.forEach((wx, i) => {
                for (let y = -7; y <= 7; y++) {
                    for (let x = -7; x <= 7; x++) {
                        const d = Math.hypot(x, y);
                        if (d > 7.2) continue;
                        if (i === 0 && y < 1) continue;               // hidden by the skirt
                        let c = hex('#141012');
                        if (d < 5 && d > 3.2) c = hex('#f4f0e8');
                        if (d <= 2.2) c = hex('#c8c4c0');
                        put(wx + x, 29 + y, c);
                    }
                }
            });
            for (let x = 10; x < 31; x++) put(x, 29, shade(body, 0.7));
        });
        const carX = Math.round(W / 2 - 48), carY = kerb + 20 - 36;

        const birds = Array.from({length: 4}, () => ({y: 8 + random() * 26, sp: 9 + random() * 7, off: random() * 400}));
        const motes = Array.from({length: 40}, () => ({x: random() * W, y: 40 + random() * 120, ph: random() * 10}));
        const crown = {x: Math.round(W * 0.74), y: 46};

        return (ctx, t, beat) => {
            const b = pulse(beat);
            ctx.drawImage(scene.canvas, 0, 0);

            // Birds gliding across the sky strip.
            ctx.fillStyle = '#3a2440';
            for (const bd of birds) {
                const x = Math.round(((t * bd.sp + bd.off) % (W + 200)) - 100);
                const y = Math.round(bd.y + Math.sin(t * 0.7 + bd.off) * 3);
                const flap = Math.floor(t * 5 + bd.off) % 2;
                ctx.fillRect(x, y, 1, 1);
                ctx.fillRect(x - 1, y - flap, 1, 1);
                ctx.fillRect(x + 1, y - flap, 1, 1);
                ctx.fillRect(x - 2, y - 1 + flap, 1, 1);
                ctx.fillRect(x + 2, y - 1 + flap, 1, 1);
            }

            // Palm fronds' shadow swaying on the walls.
            ctx.fillStyle = 'rgba(70,30,60,0.28)';
            const sway = Math.sin(t * 0.7) * 0.07 + Math.sin(t * 1.9) * 0.02;
            for (let f = 0; f < 9; f++) {
                const a = -Math.PI * 0.95 + (f / 8) * Math.PI * 1.15 + sway * (1 + f * 0.1);
                const len = 34 + (f % 3) * 6;
                for (let s = 2; s < len; s++) {
                    const droop = (s / len) * (s / len) * 14;
                    const px = crown.x + Math.cos(a) * s * 1.15;
                    const py = crown.y + Math.sin(a) * s * 0.75 + droop;
                    const leaf = Math.round((1 - s / len) * 4 + 1);
                    ctx.fillRect(Math.round(px), Math.round(py) - leaf, 1, leaf * 2);
                }
            }
            // ...and the trunk's shadow slanting down to the pavement.
            for (let y = crown.y + 2; y < walk; y++) ctx.fillRect(Math.round(crown.x + (y - crown.y) * 0.35), y, 3, 1);

            // Car shadow, then the car with a chrome glint on the beat.
            ctx.fillStyle = 'rgba(40,16,30,0.45)';
            ctx.fillRect(carX - 8, carY + 33, 100, 3);
            ctx.fillRect(carX - 4, carY + 36, 92, 1);
            ctx.drawImage(car.canvas, carX, carY);
            const gx = carX + Math.round(((t * 18) % 140) - 20);
            if (gx > carX + 28 && gx < carX + 86) {
                ctx.fillStyle = `rgba(255,255,255,${(0.5 + 0.5 * b).toFixed(3)})`;
                ctx.fillRect(gx, carY + 17 + Math.round((gx - carX - 30) / 30), 3, 1);
            }

            // Low sun from the right, haze and drifting dust.
            const sunGlow = ctx.createLinearGradient(W, 0, 0, H * 0.4);
            sunGlow.addColorStop(0, 'rgba(255,170,90,0.9)');
            sunGlow.addColorStop(1, 'rgba(255,170,90,0)');
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.16 + 0.05 * b;
            ctx.fillStyle = sunGlow;
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
            for (const m of motes) {
                const x = Math.round((m.x - t * 3 + W * 10) % W);
                const y = Math.round(m.y + Math.sin(t * 0.5 + m.ph) * 4);
                ctx.fillStyle = css(hex('#ffd8a0'), 0.25 + 0.2 * Math.sin(t + m.ph));
                ctx.fillRect(x, y, 1, 1);
            }
            ctx.globalCompositeOperation = 'source-over';
            const haze = ctx.createLinearGradient(0, walk - 50, 0, H);
            const hc = mix(hex('#ffb070'), hex('#ff8a70'), 0.5 + 0.5 * Math.sin(t * 0.2));
            haze.addColorStop(0, css(hc, 0));
            haze.addColorStop(0.5, css(hc, 0.1));
            haze.addColorStop(1, css(hc, 0.04));
            ctx.fillStyle = haze;
            ctx.fillRect(0, walk - 50, W, H - walk + 50);
        };
    }
};
