/**
 * @module elements/clear-float
 *
 * Renderer for the Wikidot `~~~~~` (clear-float) markup.
 *
 * Wikidot uses `~~~~~` (five tildes) to insert a CSS float-clearing
 * `<div>`. The direction (`left`, `right`, or `both`) is determined
 * by the number and placement of tildes in the source markup.
 */

import type { ClearFloat } from "@wdprlib/ast";
import type { RenderContext } from "../context";

/**
 * Render a clear-float element as an invisible `<div>` with the
 * appropriate CSS `clear` property.
 *
 * The output matches Wikidot's rendering: a zero-height div with
 * `font-size: 1px` to prevent layout collapse in some browsers.
 *
 * @param ctx - The current render context.
 * @param direction - CSS clear direction (`"left"`, `"right"`, or `"both"`).
 */
export function renderClearFloat(ctx: RenderContext, direction: ClearFloat): void {
  ctx.push(`<div style="clear:${direction}; height: 0px; font-size: 1px"></div>`);
}
