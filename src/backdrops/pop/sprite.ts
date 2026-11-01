import {canvas} from '../pixel';

/** Builds a small sprite from a character map; '.' is transparent. */
export function sprite(rows: string[], colours: Record<string, string>) {
    const {canvas: c, ctx} = canvas(rows[0].length, rows.length);
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '.') return;
        ctx.fillStyle = colours[ch];
        ctx.fillRect(x, y, 1, 1);
    }));
    return c;
}
