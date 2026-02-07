/**
 * @module elements/color
 *
 * Renderer for `##color|text##` inline color markup in Wikidot syntax.
 *
 * The color value is sanitized to prevent CSS injection before being
 * injected into an inline `style` attribute.
 */

import type { ColorData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, sanitizeCssColor } from "../escape";
import { renderElements } from "../render";

/**
 * Render an inline color element (`##color|text##`).
 *
 * Wraps the child elements in a `<span>` with an inline `color` style.
 * The user-supplied color value is validated and sanitized; invalid
 * values fall back to `"inherit"`.
 *
 * @param ctx - The current render context.
 * @param data - Color element data with the color value and child elements.
 */
export function renderColor(ctx: RenderContext, data: ColorData): void {
  // Sanitize color value to prevent CSS injection
  const safeColor = sanitizeCssColor(data.color, "inherit");
  ctx.push(`<span style="color: ${escapeAttr(safeColor)}">`);
  renderElements(ctx, data.elements);
  ctx.push("</span>");
}
