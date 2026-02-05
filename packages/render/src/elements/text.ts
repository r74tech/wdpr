import type { RenderContext } from "../context";
import { escapeAttr, escapeHtml, isValidEmail } from "../escape";

/** Render text (variable) - just escaped output */
export function renderText(ctx: RenderContext, data: string): void {
  ctx.pushEscaped(data);
}

/** Render raw/literal text */
export function renderRaw(ctx: RenderContext, data: string): void {
  if (data === "") return;
  ctx.push(`<span style="white-space: pre-wrap;">`);
  // Wikidot encodes spaces as &#32; in raw content
  ctx.push(escapeHtml(data).replace(/ /g, "&#32;"));
  ctx.push("</span>");
}

/** Render email element */
export function renderEmail(ctx: RenderContext, email: string): void {
  // Validate email format before creating link
  if (!isValidEmail(email)) {
    // Invalid email: render as plain text
    ctx.pushEscaped(email);
    return;
  }
  ctx.push(`<a href="mailto:${escapeAttr(email)}">${escapeHtml(email)}</a>`);
}
