import type { ColorData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, sanitizeCssColor } from "../escape";
import { renderElements } from "../render";

/** Render color element */
export function renderColor(ctx: RenderContext, data: ColorData): void {
  // Sanitize color value to prevent CSS injection
  const safeColor = sanitizeCssColor(data.color, "inherit");
  ctx.push(`<span style="color: ${escapeAttr(safeColor)}">`);
  renderElements(ctx, data.elements);
  ctx.push("</span>");
}
