/** Small drawing helpers shared by the eras backdrops. */

/** A 1px line of square pixels, so it stays crisp when scaled up. */
export function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, size = 1) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= steps; i++) {
        const f = i / steps;
        ctx.fillRect(Math.round(x0 + (x1 - x0) * f), Math.round(y0 + (y1 - y0) * f), size, size);
    }
}

/** Filled ellipse made of horizontal runs, no anti-aliasing. */
export function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
    for (let y = -ry; y <= ry; y++) {
        const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + ry * 0.6))));
        if (half > 0) ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
    }
}
