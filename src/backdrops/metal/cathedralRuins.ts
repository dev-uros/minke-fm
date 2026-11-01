import {Backdrop, bayer, css, ditherPick, hash, hex, pixels, pulse, rng, wrappingNoise} from '../pixel';
import {line} from './draw';

/**
 * A ruined gothic cathedral under a blood moon. The moon shows through the
 * empty great window, bats wheel around the broken towers, wisps of cloud
 * cross the moon and red fog rolls through the graveyard in front.
 */
export const CATHEDRAL_RUINS: Backdrop = {
    id: 'metal-cathedral-ruins',
    name: 'Blood moon ruins',
    bpm: 66,
    create(W, H) {
        const random = rng(13);
        const cx = Math.round(W / 2);
        const groundY = Math.round(H * 0.82);
        const moon = {x: cx, y: Math.round(H * 0.37), r: Math.round(H * 0.2)};

        // Pointed (equilateral) arch with its springing line at `spring`.
        const arch = (x: number, y: number, ax: number, half: number, spring: number, bottom: number) => {
            if (Math.abs(x - ax) > half || y > bottom) return false;
            if (y >= spring) return true;
            const span = half * 2;
            return Math.hypot(x - (ax + half), y - spring) <= span && Math.hypot(x - (ax - half), y - spring) <= span;
        };

        // The ruin as one solid() test, so the rim light can find its edges.
        const gableTop = (x: number) => 42 + Math.abs(x - cx) * 0.95;
        const broken = (x: number, y: number) =>
            x > cx + 6 && y < 58 + Math.sin(x * 1.7) * 3 + (x - cx) * 0.2;
        const towerL = {x0: cx - 54, x1: cx - 33, top: 30};
        const towerR = {x0: cx + 33, x1: cx + 54};
        const towerRTop = (x: number) => 64 + Math.round(Math.sin(x * 1.3) * 4 + Math.sin(x * 0.5) * 3);
        const arcadeTop = (x: number) => {
            const d = x < cx ? towerL.x0 - x : x - towerR.x1;
            const side = x < cx ? 0 : 1;
            return 94 + Math.round(Math.sin(x * 0.11 + side) * 4 + (hash(Math.floor(x / 9), side) < 0.3 ? 5 : 0) + d * (side ? 0.12 : 0.04));
        };

        const solid = (x: number, y: number): boolean => {
            if (y >= groundY) return true;
            // Central gable wall with the great window and a broken rose ring.
            if (Math.abs(x - cx) <= 33 && y >= gableTop(x) && !broken(x, y)) {
                if (arch(x, y, cx, 15, 80, 114)) {
                    if (Math.abs(x - cx) <= 1 && y > 82) return true;
                    const d = Math.hypot(x - cx, y - 70);
                    if (d > 7 && d < 9.2 && !(x > cx + 2 && y < 70)) return true;
                    if (y > 95 && y < 98) return true;
                    return false;
                }
                if (arch(x, y, cx, 5, 128, groundY)) return false;
                return true;
            }
            // Left tower with a spire.
            if (x >= towerL.x0 && x <= towerL.x1) {
                const mid = (towerL.x0 + towerL.x1) / 2;
                const spire = towerL.top - (10.5 - Math.abs(x - mid)) * 2.2;
                if (y < towerL.top && y < spire) return false;
                if (arch(x, y, mid, 3, 48, 66) || arch(x, y, mid, 3, 90, 112)) return false;
                return true;
            }
            // Right tower, snapped off.
            if (x >= towerR.x0 && x <= towerR.x1) {
                const mid = (towerR.x0 + towerR.x1) / 2;
                if (y < towerRTop(x)) return false;
                if (arch(x, y, mid, 3, 90, 112)) return false;
                return true;
            }
            // Nave arcades running off to both sides.
            if (y >= arcadeTop(x)) {
                const local = x < cx ? towerL.x0 - x : x - towerR.x1;
                const bay = ((local % 16) + 16) % 16;
                if (arch(bay, y, 8, 5, 116, groundY - 1) && y > arcadeTop(x) + 3) return false;
                return true;
            }
            return false;
        };

        const skyPal = ['#030205', '#08030a', '#12040b', '#22060e', '#3a0a12', '#5a1016'].map(hex);
        const moonPal = ['#ffb08a', '#f06a4a', '#c8322a', '#8a1a1c', '#5a0e14'].map(hex);
        const back = pixels(W, H, put => {
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) {
                    const d = Math.hypot(x - moon.x, (y - moon.y) * 1.1);
                    const halo = Math.max(0, 1 - (d - moon.r) / (W * 0.45));
                    put(x, y, ditherPick(skyPal, (y / H) * 0.25 + halo * halo * 0.85, x, y));
                }
            for (let i = 0; i < 50; i++) {
                const x = random() * W, y = random() * H * 0.5;
                if (Math.hypot(x - moon.x, y - moon.y) > moon.r * 2.2) put(x, y, hex('#d8b0b8'), 60 + random() * 120);
            }
            // The moon, darker towards the bottom-right, with a few maria.
            for (let y = -moon.r; y <= moon.r; y++)
                for (let x = -moon.r; x <= moon.r; x++) {
                    const d = Math.hypot(x, y);
                    if (d > moon.r + 0.3) continue;
                    const shade = (x + y) / (moon.r * 2.8) + 0.35 + (d / moon.r) * 0.25;
                    const mare = Math.hypot(x + 7, y + 5) < 7 || Math.hypot(x - 8, y - 2) < 5 || Math.hypot(x + 2, y - 11) < 4;
                    put(moon.x + x, moon.y + y, ditherPick(moonPal, shade + (mare ? 0.22 : 0), moon.x + x, moon.y + y));
                }
        });

        const ruin = pixels(W, H, put => {
            const stone = [hex('#060308'), hex('#0b060c')];
            const rim = hex('#7a1a1c'), rimDim = hex('#2e0a10');
            for (let y = 0; y < groundY; y++)
                for (let x = 0; x < W; x++) {
                    if (!solid(x, y)) continue;
                    const toMoon = x < moon.x ? 1 : -1;
                    const lit = !solid(x + toMoon, y) || (!solid(x, y - 1) && y < groundY - 1);
                    const course = (y % 5 === 0) || ((x + (Math.floor(y / 5) % 2) * 4) % 8 === 0);
                    const near = Math.abs(x - moon.x) < moon.r * 2.2;
                    put(x, y, lit ? (!solid(x + toMoon, y) && near ? rim : rimDim) : stone[course ? 1 : 0]);
                }
        });

        // Graveyard in front: crooked stones, crosses and a dead tree.
        const front = pixels(W, H, put => {
            const black = hex('#020103'), rim = hex('#4a0e12');
            const r = rng(77);
            const hill = (x: number) => Math.round(groundY + 4 + Math.sin(x * 0.05) * 3 + Math.sin(x * 0.13) * 1.5);
            for (let x = 0; x < W; x++) for (let y = hill(x); y < H; y++) put(x, y, y === hill(x) ? rim : black);
            for (let i = 0; i < Math.round(W / 22); i++) {
                const x = Math.round(8 + r() * (W - 16)), base = hill(x) + 2;
                if (Math.abs(x - cx) < 18) continue;
                const h = 7 + Math.round(r() * 6), lean = (r() - 0.5) * 0.25;
                if (r() < 0.4) {
                    for (let y = 0; y < h + 3; y++) put(x + Math.round(lean * y), base - y, black);
                    for (let k = -3; k <= 3; k++) put(x + k + Math.round(lean * h), base - h + 1, black);
                } else {
                    for (let y = 0; y < h; y++)
                        for (let k = -3; k <= 3; k++) {
                            if (y > h - 3 && Math.abs(k) === 3) continue;
                            if (y === h - 1 && Math.abs(k) >= 2) continue;
                            put(x + k + Math.round(lean * y), base - y, k === (x < moon.x ? 3 : -3) ? rim : black);
                        }
                }
            }
        });
        const tree = front.ctx;
        tree.fillStyle = '#020103';
        const branch = (x: number, y: number, a: number, len: number, w: number, depth: number) => {
            const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len;
            for (let k = 0; k < w; k++) line(tree, Math.round(x + k), Math.round(y), Math.round(x1 + k * 0.5), Math.round(y1));
            if (depth === 0) return;
            branch(x1, y1, a - 0.45 - random() * 0.3, len * 0.72, Math.max(1, w - 1), depth - 1);
            branch(x1, y1, a + 0.35 + random() * 0.3, len * 0.68, Math.max(1, w - 1), depth - 1);
        };
        const treeX = Math.round(W * 0.1);
        branch(treeX, groundY + 6, -Math.PI / 2 + 0.15, 26, 4, 5);

        const big = wrappingNoise(W, H, 24, random);
        const small = wrappingNoise(W, H, 7, random);
        const fogLayer = (low: number, colour: string) => pixels(W, H, put => {
            const c = hex(colour);
            for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) {
                    const band = Math.max(0, 1 - Math.abs(y - low) / 26);
                    const v = (big(x, y + low) * 0.65 + small(x, y) * 0.35) * band;
                    if (v > 0.18 + bayer(x, y) * 0.45) put(x, y, c);
                }
        });
        const fogBack = fogLayer(groundY - 6, '#7a2a34');
        const fogFront = fogLayer(H - 12, '#5a1e28');

        const wisps = pixels(W, H, put => {
            const c = hex('#120308');
            for (let y = 0; y < H * 0.6; y++)
                for (let x = 0; x < W; x++) {
                    const v = big(x * 2, y * 3) * Math.max(0, 1 - Math.abs(y - moon.y - 4) / 22);
                    if (v > 0.45 + bayer(x, y) * 0.25) put(x, y, c);
                }
        });

        const bats = Array.from({length: 9}, (_, i) => ({
            ax: 30 + random() * W * 0.35, ay: 10 + random() * 26, cyX: random() * 6, cyY: random() * 6,
            wx: 0.2 + random() * 0.35, wy: 0.4 + random() * 0.6, size: i < 2 ? 2 : 1,
            home: cx + (random() - 0.5) * 90, homeY: 38 + random() * 30
        }));
        const red = hex('#ff3a2a');

        return (ctx, t, beat) => {
            const k = pulse(beat);
            ctx.drawImage(back.canvas, 0, 0);

            // The moon's halo breathes with the beat.
            ctx.globalCompositeOperation = 'lighter';
            const halo = ctx.createRadialGradient(moon.x, moon.y, moon.r * 0.8, moon.x, moon.y, moon.r * 2.6);
            halo.addColorStop(0, css(red, 0.1 + 0.08 * k));
            halo.addColorStop(1, css(red, 0));
            ctx.fillStyle = halo;
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = 'source-over';

            const ws = Math.floor(t * 1.5) % W;
            ctx.drawImage(wisps.canvas, -ws, 0);
            ctx.drawImage(wisps.canvas, W - ws, 0);

            // A faint fire flickering somewhere inside, seen through the door.
            ctx.fillStyle = css(hex('#ff5a20'), 0.2 + 0.1 * Math.sin(t * 7) * Math.sin(t * 3.1) + 0.1 * k);
            ctx.fillRect(cx - 6, 118, 13, groundY - 118);
            ctx.fillStyle = css(hex('#ffb040'), 0.25 + 0.15 * Math.sin(t * 11));
            ctx.fillRect(cx - 2, groundY - 4, 5, 4);

            ctx.drawImage(ruin.canvas, 0, 0);

            const f1 = Math.floor(t * 4) % W, f2 = Math.floor(t * 9) % W;
            ctx.globalAlpha = 0.4;
            ctx.drawImage(fogBack.canvas, -f1, 0);
            ctx.drawImage(fogBack.canvas, W - f1, 0);
            ctx.globalAlpha = 1;
            ctx.drawImage(front.canvas, 0, 0);
            ctx.globalAlpha = 0.3;
            ctx.drawImage(fogFront.canvas, -f2, 0);
            ctx.drawImage(fogFront.canvas, W - f2, 0);
            ctx.globalAlpha = 1;

            // Bats loop around the towers, wings flapping.
            ctx.fillStyle = '#050204';
            bats.forEach((b, i) => {
                const x = Math.round(b.home + Math.sin(t * b.wx + b.cyX) * b.ax);
                const y = Math.round(b.homeY + Math.sin(t * b.wy + b.cyY) * b.ay * 0.6 + Math.sin(t * 3 + i) * 2);
                const up = Math.floor(t * 9 + i * 1.7) % 2 === 0;
                const s = b.size;
                ctx.fillRect(x, y, s, s * 2);
                const wy = up ? -s : s;
                ctx.fillRect(x - s, y, s, s);
                ctx.fillRect(x + s, y, s, s);
                ctx.fillRect(x - 2 * s, y + wy, s, s);
                ctx.fillRect(x + 2 * s, y + wy, s, s);
                if (s > 1) {
                    ctx.fillRect(x - 3 * s, y + wy * 2, s, s);
                    ctx.fillRect(x + 3 * s, y + wy * 2, s, s);
                }
            });
        };
    }
};
