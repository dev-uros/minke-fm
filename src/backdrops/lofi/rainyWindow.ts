import {Backdrop, css, disc, ditherPick, hex, pixels, pulse, rng} from '../pixel';
import {paintWindows, skyline} from '../skyline';

interface Palette {
    sky: string[];
    far: string;
    near: string;
    lit: string[];
    wall: string[];
    frame: string;
    frameLight: string;
    sill: string;
    moon: string | null;
    rain: string;
}

/**
 * A city at night seen through a rainy window, from a room lit by a desk lamp.
 * Rain falls outside, drops crawl down the glass, steam rises from a mug.
 */
export function rainyWindow(id: string, name: string, p: Palette): Backdrop {
    return {
        id, name, bpm: 72,
        create(W, H) {
            const random = rng(11);
            const win = {x0: Math.round(W * 0.2), y0: 16, x1: Math.round(W * 0.8), y1: Math.round(H * 0.68)};
            const sky = p.sky.map(hex);
            const wall = p.wall.map(hex);
            const lamp = {x: Math.round(W * 0.07), y: Math.round(H * 0.6)};

            // Outside: sky, moon, two rows of buildings.
            const outside = pixels(W, H, put => {
                for (let y = 0; y < H; y++)
                    for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, y / win.y1, x, y));
                if (p.moon) {
                    for (let i = 0; i < 70; i++)
                        put(random() * W, random() * win.y1 * 0.6, hex('#c9d2ff'), 90 + random() * 120);
                    const moon = hex(p.moon);
                    disc(put, Math.round(W * 0.66), 34, 8, (x, y) =>
                        (x * 7 + y * 3) % 11 === 0 ? hex('#cfc3a0') : moon);
                }
            });
            skyline(outside.ctx, {
                from: win.x0 - 12, to: win.x1 + 12, base: win.y1, minHeight: 30, maxHeight: 78,
                minWidth: 8, maxWidth: 18, colour: p.far, lit: [css(hex(p.lit[0]), 0.35)], litChance: 0.12
            }, random).forEach(w => {
                outside.ctx.fillStyle = w.colour;
                outside.ctx.fillRect(w.x, w.y, w.w, w.h);
            });
            const lit = skyline(outside.ctx, {
                from: win.x0 - 12, to: win.x1 + 12, base: win.y1, minHeight: 14, maxHeight: 52,
                minWidth: 10, maxWidth: 24, colour: p.near, lit: p.lit, litChance: 0.28
            }, random);

            // The room: a wall lit from the lamp, with a hole where the glass is.
            const room = pixels(W, H, put => {
                const reach = W * 0.75;
                for (let y = 0; y < H; y++) {
                    for (let x = 0; x < W; x++) {
                        if (x >= win.x0 && x < win.x1 && y >= win.y0 && y < win.y1) continue;
                        const d = Math.hypot(x - lamp.x, (y - lamp.y) * 1.3);
                        put(x, y, ditherPick(wall, 1 - Math.min(1, d / reach), x, y));
                    }
                }
            });
            const r = room.ctx;
            // Frame and mullions.
            r.fillStyle = p.frame;
            r.fillRect(win.x0 - 4, win.y0 - 4, win.x1 - win.x0 + 8, 4);
            r.fillRect(win.x0 - 4, win.y0, 4, win.y1 - win.y0);
            r.fillRect(win.x1, win.y0, 4, win.y1 - win.y0);
            const midX = Math.round((win.x0 + win.x1) / 2);
            const midY = Math.round(win.y0 + (win.y1 - win.y0) * 0.42);
            r.fillRect(midX - 1, win.y0, 2, win.y1 - win.y0);
            r.fillRect(win.x0, midY, win.x1 - win.x0, 2);
            r.fillStyle = p.frameLight;
            r.fillRect(win.x0 - 4, win.y0 - 4, 1, win.y1 - win.y0 + 4);
            r.fillRect(win.x0 - 4, win.y0 - 4, win.x1 - win.x0 + 8, 1);
            // Sill.
            r.fillStyle = p.sill;
            r.fillRect(win.x0 - 10, win.y1, win.x1 - win.x0 + 20, 6);
            r.fillStyle = p.frameLight;
            r.fillRect(win.x0 - 10, win.y1, win.x1 - win.x0 + 20, 1);
            r.fillStyle = 'rgba(0,0,0,0.35)';
            r.fillRect(win.x0 - 10, win.y1 + 6, win.x1 - win.x0 + 20, 2);

            // A plant on the left of the sill.
            const potX = win.x0 + 8;
            r.fillStyle = '#7a3b2a';
            r.fillRect(potX, win.y1 - 7, 9, 7);
            r.fillStyle = '#93503a';
            r.fillRect(potX - 1, win.y1 - 8, 11, 2);
            const leaves = ['#24452f', '#2f5a3a', '#3f7a48'];
            for (let i = 0; i < 26; i++) {
                const a = -Math.PI / 2 + (random() - 0.5) * 2.4;
                const len = 4 + random() * 12;
                for (let k = 0; k < len; k++) {
                    r.fillStyle = leaves[Math.min(2, Math.floor((k / len) * 3))];
                    r.fillRect(Math.round(potX + 4 + Math.cos(a) * k), Math.round(win.y1 - 9 + Math.sin(a) * k * 0.9), 1, 1);
                }
            }
            // A mug on the right.
            const mug = {x: win.x1 - 22, y: win.y1 - 7};
            r.fillStyle = '#d8c7b2';
            r.fillRect(mug.x, mug.y, 7, 7);
            r.fillRect(mug.x + 7, mug.y + 2, 2, 1);
            r.fillRect(mug.x + 8, mug.y + 2, 1, 3);
            r.fillRect(mug.x + 7, mug.y + 4, 2, 1);
            r.fillStyle = '#b39a84';
            r.fillRect(mug.x, mug.y + 5, 7, 2);
            // A desk lamp on the left, half in view.
            r.fillStyle = '#2a1c1c';
            r.fillRect(lamp.x - 1, lamp.y, 2, H - lamp.y);
            r.fillStyle = '#f2b35a';
            r.beginPath();
            r.moveTo(lamp.x - 5, lamp.y - 10);
            r.lineTo(lamp.x + 5, lamp.y - 10);
            r.lineTo(lamp.x + 9, lamp.y);
            r.lineTo(lamp.x - 9, lamp.y);
            r.fill();
            r.fillStyle = '#ffe1a0';
            r.fillRect(lamp.x - 8, lamp.y - 1, 16, 1);

            const glow = r.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, W * 0.55);
            glow.addColorStop(0, 'rgba(255,190,110,1)');
            glow.addColorStop(1, 'rgba(255,190,110,0)');

            const drops = Array.from({length: 150}, () => ({
                x: win.x0 + random() * (win.x1 - win.x0 + 20),
                y: random() * H,
                len: 3 + Math.floor(random() * 4),
                speed: 110 + random() * 80
            }));
            const glass = Array.from({length: 16}, () => ({
                x: win.x0 + 2 + Math.floor(random() * (win.x1 - win.x0 - 4)),
                y: win.y0 + random() * (win.y1 - win.y0),
                speed: 1 + random() * 6,
                pause: random() * 10
            }));
            const rain = hex(p.rain);
            let last = 0;

            return (ctx, t, beat) => {
                const dt = Math.min(0.1, t - last);
                last = t;

                ctx.drawImage(outside.canvas, 0, 0);
                paintWindows(ctx, lit, t);

                ctx.fillStyle = css(rain, 0.45);
                for (const d of drops) {
                    d.y += d.speed * dt;
                    d.x -= d.speed * dt * 0.18;
                    if (d.y > win.y1) {
                        d.y = win.y0 - random() * 20;
                        d.x = win.x0 + random() * (win.x1 - win.x0 + 20);
                    }
                    for (let k = 0; k < d.len; k++) ctx.fillRect(Math.round(d.x + k * 0.18), Math.round(d.y - k), 1, 1);
                }

                // Drops on the glass crawl, stall, and crawl again.
                for (const g of glass) {
                    if ((t + g.pause) % 6 > 2) g.y += g.speed * dt;
                    if (g.y > win.y1) {
                        g.y = win.y0;
                        g.x = win.x0 + 2 + Math.floor(random() * (win.x1 - win.x0 - 4));
                    }
                    ctx.fillStyle = css(rain, 0.25);
                    ctx.fillRect(g.x, Math.round(g.y) - 4, 1, 4);
                    ctx.fillStyle = css(rain, 0.85);
                    ctx.fillRect(g.x, Math.round(g.y), 1, 1);
                }

                ctx.drawImage(room.canvas, 0, 0);

                // Steam from the mug.
                for (let j = 0; j < 2; j++) {
                    for (let k = 0; k < 12; k++) {
                        const rise = (k + t * 3 + j * 6) % 12;
                        const sx = mug.x + 2 + j * 3 + Math.round(Math.sin(t * 1.4 + rise * 0.5 + j) * 1.5);
                        ctx.fillStyle = `rgba(255,240,225,${(0.3 * (1 - rise / 12)).toFixed(3)})`;
                        ctx.fillRect(sx, Math.round(mug.y - 2 - rise), 1, 1);
                    }
                }

                // The lamp breathes gently with the tempo.
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.07 + 0.03 * pulse(beat);
                ctx.fillStyle = glow;
                ctx.fillRect(0, 0, W, H);
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
            };
        }
    };
}

export const RAINY_NIGHT = rainyWindow('rainy-night', 'Rainy window', {
    sky: ['#070a1f', '#0d1434', '#1a1f4c', '#2c2862'],
    far: '#1a1a40',
    near: '#0c0b1e',
    lit: ['#f2b35a', '#ffd98a', '#9fc0ff'],
    wall: ['#0b0810', '#150f1c', '#24161f', '#3a2226', '#5a342b'],
    frame: '#1e1318',
    frameLight: '#5b3a30',
    sill: '#33222a',
    moon: '#f1e6c4',
    rain: '#a9bcff'
});
