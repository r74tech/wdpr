/**
 *
 * Renderer for explicit line breaks (`_` at end of line in Wikidot markup).
 *
 * Multiple consecutive line-break elements produce multiple `<br />` tags.
 *
 * @module
 */

import type { RenderContext } from "../context";

/**
 * Render one or more consecutive line breaks as `<br />` tags.
 *
 * @param ctx - The current render context.
 * @param count - Number of `<br />` tags to emit.
 */
export function renderLineBreaks(ctx: RenderContext, count: number): void {
  for (let i = 0; i < count; i++) {
    ctx.push("<br />");
  }
}
