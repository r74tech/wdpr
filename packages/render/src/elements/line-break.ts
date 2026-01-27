import type { RenderContext } from "../context";

/** Render multiple line breaks */
export function renderLineBreaks(ctx: RenderContext, count: number): void {
  for (let i = 0; i < count; i++) {
    ctx.push("<br />");
  }
}
