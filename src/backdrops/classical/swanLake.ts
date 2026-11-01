import {Backdrop, canvas, css, disc, ditherPick, hash, hex, pixels, pulse, rng} from '../pixel';
import {sprite} from './draw';

/**
 * A lake under a full moon: two swans glide across water that carries the
 * moon's broken reflection, while a weeping willow sways at the edge.
 */
export const SWAN_LAKE: Backdrop = {
    id: 'classical-swan-lake',
    name: 'Moonlit lake',
    bpm: 66,
    create(W, H) {
        const random = rng(57);
        const horizon = 98;
        const moon = {x: Math.round(W * 0.56), y: 36, r: 10};

        const sky = ['#04061a', '#080d2a', '#10173c', '#1b2150', '#2b2c62', '#433a74'].map(hex);
        const water = ['#0a1230', '#070c22', '#04081a', '#03050f'].map(hex);

        // Everything above the waterline; it is mirrored to make the reflection.
        const above = pixels(W, horizon, put => {
            for (let y = 0; y < horizon; y++)
                for (let x = 0; x < W; x++) put(x, y, ditherPick(sky, y / horizon, x, y));
            const moonC = hex('#f3ecd2'), mare = hex('#cfc6a8');
            disc(put, moon.x, moon.y, moon.r, (x, y) => {
                const dx = x - moon.x + 3, dy = y - moon.y + 2;
                return dx * dx + dy * dy < 10 || (x - moon.x - 4) ** 2 + (y - moon.y - 3) ** 2 < 6 ? mare : moonC;
            });
            // Far shore: a soft line of tree crowns with a few tall poplars.
            const shore = hex('#070914'), rim = hex('#1c2448');
            const top = new Array<number>(W).fill(horizon - 3);
            for (let i = 0; i < W / 4; i++) {
                const tx = random() * W, r = 3 + random() * 6, ty = horizon - 4 - random() * 5;
                for (let x = Math.floor(tx - r); x <= tx + r; x++) {
                    if (x < 0 || x >= W) continue;
                    const h = ty - Math.sqrt(Math.max(0, r * r - (x - tx) ** 2)) * 0.8;
                    top[x] = Math.min(top[x], Math.round(h));
                }
            }
            for (let i = 0; i < 5; i++) {
                const px = Math.round(random() * W), ph = 14 + random() * 10;
                for (let x = px - 2; x <= px + 2; x++) {
                    if (x < 0 || x >= W) continue;
                    top[x] = Math.min(top[x], Math.round(horizon - ph + Math.abs(x - px) * 3));
                }
            }
            for (let x = 0; x < W; x++) {
                for (let y = top[x]; y < horizon; y++) put(x, y, y === top[x] && x > moon.x - 60 && x < moon.x + 60 ? rim : shore);
            }
        });

        // The reflection: the sky upside down, darkened into the water colour.
        const mirror = canvas(W, H - horizon);
        mirror.ctx.save();
        mirror.ctx.scale(1, -1);
        mirror.ctx.drawImage(above.canvas, 0, -horizon);
        mirror.ctx.restore();
        const tint = pixels(W, H - horizon, put => {
            for (let y = 0; y < H - horizon; y++)
                for (let x = 0; x < W; x++) {
                    // Thinner over the moon's path so its reflection stays bright.
                    const path = Math.exp(-(((x - moon.x) / 14) ** 2));
                    put(x, y, ditherPick(water, y / (H - horizon), x, y), Math.round((150 + y / (H - horizon) * 80) * (1 - 0.6 * path)));
                }
        });
        mirror.ctx.drawImage(tint.canvas, 0, 0);

        // The willow on the left: a canopy mass and strands hanging from it.
        const leaf = ['#050a0c', '#0b1a1a', '#14302c', '#22483e', '#3a6a58'].map(hex);
        const willowW = Math.round(Math.max(70, W * 0.3));
        const canopy = pixels(W, H, put => {
            // Trunk leaning in from the left edge.
            for (let y = 20; y < horizon + 6; y++) {
                const x = Math.round(4 + (horizon - y) * 0.12);
                for (let k = -3; k <= 3; k++) put(x + k, y, leaf[k > 1 ? 1 : 0]);
            }
            for (let i = 0; i < 46; i++) {
                const u = random();
                const bx = u * willowW, by = 4 + u * 14 + random() * 10 - 6;
                const r = 4 + Math.round(random() * 7);
                for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
                    if (x * x + y * y > r * r) continue;
                    // Lit from the moon, up and to the right.
                    const light = 0.35 + (x - y) / (r * 5) - u * 0.1;
                    put(bx + x, by + y, ditherPick(leaf.slice(0, 4), light, bx + x, by + y));
                }
            }
        });
        const strands = Array.from({length: 30}, (_, i) => {
            const u = (i + random() * 0.8) / 30;
            const ax = Math.round(u * willowW * 1.05);
            return {
                x: ax,
                y: Math.round(8 + u * 18 + random() * 6),
                len: Math.round((1 - u * 0.45) * (horizon - 10) * (0.7 + random() * 0.35)),
                phase: random() * 6,
                shade: random()
            };
        });

        const swanRows = [
            '............www.....',
            '...........wwwwkoo..',
            '...........ww...o...',
            '............w.......',
            '............ww......',
            '....h........w......',
            '...hww.......w......',
            '..hwwwwh....ww......',
            '.hwwwwwwwh..www.....',
            'hwwwwwwwwwwwwwww....',
            '.wwwwwwwwwwwwwwwh...',
            '..swwwwwwwwwwwwss...',
            '...sssswwwwwsss.....',
            '.....sssssssss......'
        ];
        const swanColours = {w: '#e6eaf6', h: '#ffffff', s: '#8c96b8', k: '#0a0a10', o: '#d8742a'};
        const swanRight = sprite(swanRows, swanColours);
        const swanLeft = sprite(swanRows, swanColours, true);
        const swans = [
            {y: 112, speed: 2.4, start: 0.3, dir: 1},
            {y: 138, speed: 1.6, start: 0.35, dir: -1}
        ];

        const stars = Array.from({length: 70}, () => ({
            x: Math.floor(random() * W), y: Math.floor(random() * (horizon - 30)), seed: random() * 50, b: random()
        }));
        const fireflies = Array.from({length: 9}, () => ({x: random() * W, y: horizon + 4 + random() * 30, seed: random() * 40}));

        return (ctx, t, beat) => {
            const breath = pulse(beat);
            ctx.drawImage(above.canvas, 0, 0);

            for (const s of stars) {
                const tw = 0.35 + 0.4 * s.b + 0.25 * Math.sin(t * (0.8 + s.b) + s.seed);
                ctx.fillStyle = css([210, 220, 255], Math.max(0, tw));
                ctx.fillRect(s.x, s.y, 1, 1);
            }

            // Moon halo breathes with the tempo.
            ctx.globalCompositeOperation = 'lighter';
            const halo = ctx.createRadialGradient(moon.x, moon.y, moon.r, moon.x, moon.y, moon.r * 4);
            halo.addColorStop(0, `rgba(200,200,255,${(0.16 + 0.05 * breath).toFixed(3)})`);
            halo.addColorStop(1, 'rgba(200,200,255,0)');
            ctx.fillStyle = halo;
            ctx.fillRect(moon.x - moon.r * 4, moon.y - moon.r * 4, moon.r * 8, moon.r * 8);
            ctx.globalCompositeOperation = 'source-over';

            // Water: each row of the reflection wobbles sideways, more so up close.
            const depth = H - horizon;
            for (let y = 0; y < depth; y++) {
                const amp = 0.6 + y / 22;
                const off = Math.round(Math.sin(y * 0.45 - t * 1.7) * amp + Math.sin(y * 0.13 + t * 0.6) * amp * 0.5);
                ctx.drawImage(mirror.canvas, 0, y, W, 1, off, horizon + y, W, 1);
                if (off > 0) ctx.drawImage(mirror.canvas, 0, y, 1, 1, 0, horizon + y, off, 1);
                else if (off < 0) ctx.drawImage(mirror.canvas, W - 1, y, 1, 1, W + off, horizon + y, -off, 1);
            }
            ctx.fillStyle = 'rgba(120,130,190,0.35)';
            ctx.fillRect(0, horizon, W, 1);

            // Glitter on the moon's path.
            const tick = Math.floor(t * 4);
            ctx.globalCompositeOperation = 'lighter';
            for (let y = horizon + 2; y < H; y += 2) {
                const f = (y - horizon) / depth;
                if (hash(y, tick) < 0.45) continue;
                const spread = 4 + f * 26;
                const x = Math.round(moon.x + (hash(y, tick + 0.5) - 0.5) * spread * 2);
                const w = 1 + Math.floor(hash(tick, y) * (2 + f * 6));
                ctx.fillStyle = css([255, 240, 200], 0.25 + 0.3 * (1 - f));
                ctx.fillRect(x, y, w, 1);
            }
            ctx.globalCompositeOperation = 'source-over';

            // Swans, their reflections and wakes.
            const sw = swanRows[0].length, sh = swanRows.length;
            for (const s of swans) {
                const span = W + 40;
                const travel = ((s.start * span + t * s.speed) % span + span) % span;
                const x = Math.round(s.dir > 0 ? travel - 20 : W + 20 - travel - sw);
                const bob = Math.round(Math.sin(t * 1.1 + s.y) * 0.6);
                const y = s.y + bob;
                const img = s.dir > 0 ? swanRight : swanLeft;
                // Wake: two faint lines fanning out behind.
                for (let k = 1; k < 26; k++) {
                    const wx = s.dir > 0 ? x - k : x + sw + k;
                    const a = 0.28 * (1 - k / 26);
                    ctx.fillStyle = css([170, 180, 230], a);
                    ctx.fillRect(wx, y + sh - 1 + Math.round(k * 0.18), 1, 1);
                    if (k % 2 === 0) ctx.fillRect(wx, y + sh - 1 - Math.round(k * 0.08), 1, 1);
                }
                // Reflection, upside down and broken by the ripples.
                ctx.globalAlpha = 0.3;
                for (let r = 0; r < sh; r++) {
                    const off = Math.round(Math.sin(r * 0.9 - t * 2.4) * (0.5 + r * 0.12));
                    ctx.drawImage(img, 0, sh - 1 - r, sw, 1, x + off, y + sh + r, sw, 1);
                }
                ctx.globalAlpha = 1;
                ctx.drawImage(img, x, y);
            }

            // Willow strands sway in a slow breeze.
            ctx.drawImage(canopy.canvas, 0, 0);
            const gust = Math.sin(t * 0.23) * 0.5 + 0.5;
            for (const s of strands) {
                for (let k = 0; k < s.len; k += 2) {
                    const f = k / s.len;
                    const sway = Math.sin(t * 0.7 + s.phase + k * 0.035) * f * f * (2 + gust * 4);
                    const x = Math.round(s.x + sway + f * 3);
                    const y = s.y + k;
                    const c = leaf[1 + Math.min(3, Math.floor(s.shade * 2 + (k % 6 === 0 ? 1 : 0) + (f > 0.85 ? 1 : 0)))];
                    ctx.fillStyle = css(c);
                    ctx.fillRect(x, y, 1, 2);
                    if (k % 4 === 0) ctx.fillRect(x + ((k / 4) % 2 ? 1 : -1), y + 1, 1, 1);
                }
            }

            // A few fireflies over the water near the bank.
            for (const f of fireflies) {
                const a = Math.max(0, Math.sin(t * 0.9 + f.seed)) * 0.9;
                if (a < 0.05) continue;
                const fx = Math.round(f.x + Math.sin(t * 0.3 + f.seed) * 10);
                const fy = Math.round(f.y + Math.sin(t * 0.5 + f.seed * 2) * 4);
                ctx.fillStyle = css([220, 255, 150], a);
                ctx.fillRect(fx, fy, 1, 1);
                ctx.fillStyle = css([220, 255, 150], a * 0.25);
                ctx.fillRect(fx - 1, fy, 3, 1);
                ctx.fillRect(fx, fy - 1, 1, 3);
            }
        };
    }
};
