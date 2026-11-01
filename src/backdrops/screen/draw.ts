/** Filled pixel disc drawn as horizontal spans, cheap enough to do per frame. */
export function fillDisc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    cx = Math.round(cx);
    cy = Math.round(cy);
    for (let dy = -r; dy <= r; dy++) {
        const half = Math.floor(Math.sqrt(Math.max(0, r * r + r * 0.6 - dy * dy)));
        ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
    }
}
