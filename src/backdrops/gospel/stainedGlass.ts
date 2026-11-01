import {Backdrop, bayer, css, ditherPick, hash, hex, pixels, pulse, RGB, rng} from '../pixel';

/**
 * Inside a dark stone chapel: a tall pointed window of leaded glass with a
 * rose at its head and a gold cross in its middle. Sunlight pours through it
 * in a slanting shaft full of dust, lays the glass colours across the floor,
 * and swells softly on the beat as clouds pass outside.
 */
export const STAINED_GLASS: Backdrop = {
    id: 'gospel-stained-glass',
    name: 'Stained glass',
    bpm: 72,
    create(W, H) {
        const random = rng(88);
        const ww = Math.max(44, Math.round(W * 0.17) & ~1);
        const x0 = Math.round(W * 0.42 - ww / 2), x1 = x0 + ww;
        const top = 12;
        const archBase = top + Math.round(ww * 0.87);
        const sill = Math.round(H * 0.6);
        const floorY = Math.round(H * 0.72);
        const cx = x0 + ww / 2;

        const inside = (x: number, y: number) => {
            if (x < x0 || x >= x1 || y < top || y >= sill) return false;
            if (y >= archBase) return true;
            return (x - x0) ** 2 + (y - archBase) ** 2 <= ww * ww && (x - x1) ** 2 + (y - archBase) ** 2 <= ww * ww;
        };

        // The glass: diamond quarries, a rose at the head, a gold cross in the middle.
        const jewels = ['#1d3fb8', '#2a5bd8', '#173080', '#b0203a', '#2a5bd8', '#d8a52a', '#2f8f5a', '#b0203a', '#6a2a9a', '#1d3fb8'].map(hex);
        const gold = hex('#ffd76a'), pale = hex('#fff2c0'), lead = hex('#0b0810');
        const roseY = top + Math.round(ww * 0.5), roseR = Math.round(ww * 0.3);
        const crossTop = archBase + 4, crossBottom = sill - 8, crossBar = archBase + Math.round((sill - archBase) * 0.3);
        const glass = pixels(W, H, put => {
            for (let y = top; y < sill; y++) {
                for (let x = x0; x < x1; x++) {
                    if (!inside(x, y)) continue;
                    // Lead along the border and the central mullion.
                    if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1)) {
                        put(x, y, lead);
                        continue;
                    }
                    const rx = x - cx + 0.5, ry = y - roseY;
                    const rd = Math.hypot(rx, ry);
                    let c: RGB;
                    if (rd <= roseR) {
                        // Rose window: rings of petals.
                        if (Math.abs(rd - roseR) < 1 || Math.abs(rd - roseR * 0.4) < 0.7) c = lead;
                        else if (rd < roseR * 0.4) c = rd < 2 ? pale : gold;
                        else {
                            const a = Math.atan2(ry, rx);
                            const sector = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8);
                            const edge = Math.abs(Math.sin(a * 4)) < 0.12;
                            c = edge ? lead : sector % 2 ? hex('#b0203a') : hex('#2a5bd8');
                        }
                    } else if (y > archBase && Math.abs(y - crossBar) <= 2 && Math.abs(rx) < ww * 0.28
                        || y > crossTop && y < crossBottom && Math.abs(rx) <= 3) {
                        const edgeY = Math.abs(y - crossBar) === 2 && Math.abs(rx) > 3;
                        const edgeX = Math.abs(rx) > 2.5 && !(Math.abs(y - crossBar) < 2);
                        c = edgeX || edgeY ? lead : (Math.abs(rx) < 1.5 ? pale : gold);
                    } else if (Math.abs(rd - roseR) < 2.5 || Math.abs(x + 0.5 - cx) < 1 || y === archBase) {
                        c = lead;
                    } else {
                        const u = x + y, v = x - y;
                        if (u % 9 === 0 || ((v % 9) + 9) % 9 === 0) c = lead;
                        else {
                            const id = Math.floor(u / 9) * 31 + Math.floor(v / 9);
                            c = jewels[Math.floor(hash(id, 3) * jewels.length)];
                            if (bayer(x, y) < 0.18) c = c.map(v => Math.min(255, v + 40)) as RGB;
                        }
                    }
                    put(x, y, c);
                }
            }
        });

        // Stone wall and floor, lit faintly around the window.
        const stone = ['#07060c', '#0e0c16', '#17131f', '#221b29', '#33283a'].map(hex);
        const flags = ['#06050a', '#0f0c14', '#1a1520', '#2a2230'].map(hex);
        const room = pixels(W, H, put => {
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    if (inside(x, y)) continue;
                    if (y < floorY) {
                        const d = Math.hypot((x - cx) / (W * 0.5), (y - (top + sill) / 2) / (H * 0.6));
                        let v = 1 - d * 0.9;
                        const row = Math.floor(y / 7);
                        const joint = y % 7 === 0 || (x + (row % 2) * 7) % 14 === 0;
                        if (joint) v -= 0.18;
                        v += (hash(Math.floor((x + (row % 2) * 7) / 14), row) - 0.5) * 0.12;
                        put(x, y, ditherPick(stone, v, x, y));
                    } else {
                        const depth = (y - floorY) / (H - floorY);
                        const lane = Math.round((x - cx) / (0.3 + depth));
                        const joint = lane % 22 === 0 || Math.floor(Math.pow(depth, 0.6) * 9) !== Math.floor(Math.pow((y + 1 - floorY) / (H - floorY), 0.6) * 9);
                        let v = 0.25 + depth * 0.35 - Math.abs(x - cx) / W * 0.4;
                        if (joint) v -= 0.2;
                        put(x, y, ditherPick(flags, v, x, y));
                    }
                }
            }
            // Deep stone reveal and sill around the window.
            const frame = hex('#3e3346'), frameLit = hex('#5a4a5e');
            for (let y = top - 3; y < sill + 3; y++) {
                for (let x = x0 - 4; x < x1 + 4; x++) {
                    if (inside(x, y)) continue;
                    let near = false;
                    for (let k = 1; k <= 3 && !near; k++)
                        near = inside(x + k, y) || inside(x - k, y) || inside(x, y + k) || inside(x, y - k);
                    if (near) put(x, y, x < cx ? frameLit : frame);
                }
            }
            for (let x = x0 - 6; x < x1 + 6; x++) {
                put(x, sill, frameLit);
                put(x, sill + 1, frame);
                put(x, sill + 2, frame);
            }
        });

        // Where the shaft lands on the floor, and the motes floating in it.
        const shift = Math.round(ww * 0.9);
        const poolFar = floorY + 6, poolNear = H - 4;
        const motes = Array.from({length: 70}, () => ({s: random(), u: random(), speed: 0.004 + random() * 0.01, a: random()}));
        const beamAt = (s: number, u: number) => {
            const wx = x0 + u * ww, wy = archBase + (sill - archBase) * 0.3;
            const px = x0 + shift + u * ww * 1.5 - ww * 0.25, py = (poolFar + poolNear) / 2;
            return [wx + (px - wx) * s, wy + (py - wy) * s];
        };
        const shaft = hex('#ffe6b0');

        return (ctx, t, beat) => {
            const clouds = 0.72 + 0.18 * Math.sin(t * 0.09) + 0.1 * Math.sin(t * 0.23 + 1);
            const light = clouds * (0.88 + 0.12 * pulse(beat));

            ctx.drawImage(room.canvas, 0, 0);
            ctx.globalAlpha = 0.55 + 0.45 * light;
            ctx.drawImage(glass.canvas, 0, 0);
            ctx.globalAlpha = 1;

            ctx.globalCompositeOperation = 'lighter';

            // Glass colours laid on the floor: the window flipped and sheared.
            ctx.save();
            ctx.globalAlpha = 0.4 * light;
            // Image (u, v) lands at x = 1.5(u - x0) + far edge + lean * (sill - v).
            const h = sill - top, lean = (shift * 0.4) / h, farX = x0 + shift - ww * 0.25;
            ctx.setTransform(1.5, 0, -lean, -(poolNear - poolFar) / h,
                farX - 1.5 * x0 + lean * sill, poolNear + (poolNear - poolFar) * (top / h));
            ctx.drawImage(glass.canvas, 0, 0);
            ctx.restore();

            // The shaft itself: a soft wedge from the window to the floor.
            const grad = ctx.createLinearGradient(x0, top, x0 + shift, poolNear);
            grad.addColorStop(0, css(shaft, 0.24 * light));
            grad.addColorStop(1, css(shaft, 0.06 * light));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(x0 + 2, archBase - 6);
            ctx.lineTo(x1 - 2, archBase - 6);
            ctx.lineTo(x0 + shift + ww * 1.25, poolNear);
            ctx.lineTo(x0 + shift - ww * 0.25, poolFar);
            ctx.lineTo(x0 + 2, sill);
            ctx.closePath();
            ctx.fill();

            // Dust drifting slowly down the beam.
            for (const m of motes) {
                const s = (m.s + t * m.speed) % 1;
                const u = m.u + Math.sin(t * 0.3 + m.a * 9) * 0.08;
                const [mx, my] = beamAt(s, u);
                const tw = 0.5 + 0.5 * Math.sin(t * 1.3 + m.a * 20);
                ctx.fillStyle = css(shaft, (0.15 + 0.5 * tw) * light * Math.sin(s * Math.PI));
                ctx.fillRect(Math.round(mx), Math.round(my), 1, 1);
            }
            ctx.globalCompositeOperation = 'source-over';
        };
    }
};
