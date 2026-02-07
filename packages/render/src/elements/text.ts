/**
 * @module elements/text
 *
 * Renderers for text-level AST nodes: plain text, raw/literal text,
 * and email addresses.
 */

import type { RenderContext } from "../context";
import { escapeAttr, escapeHtml, isValidEmail } from "../escape";

/**
 * Render a plain text node by HTML-escaping and appending to the output.
 *
 * @param ctx - The current render context.
 * @param data - The raw text content.
 */
export function renderText(ctx: RenderContext, data: string): void {
  ctx.pushEscaped(data);
}

/**
 * Render raw/literal text (Wikidot `@@...@@` syntax).
 *
 * Raw text is rendered inside a `<span style="white-space: pre-wrap;">` with
 * spaces encoded as `&#32;` to preserve Wikidot's exact formatting. Empty
 * strings produce no output.
 *
 * @param ctx - The current render context.
 * @param data - The raw text content.
 */
export function renderRaw(ctx: RenderContext, data: string): void {
  if (data === "") return;
  ctx.push(`<span style="white-space: pre-wrap;">`);
  // Wikidot encodes spaces as &#32; in raw content
  ctx.push(escapeHtml(data).replace(/ /g, "&#32;"));
  ctx.push("</span>");
}

/**
 * Render an email address element as a `mailto:` link.
 *
 * The email is validated before creating the link. Invalid email addresses
 * are rendered as plain escaped text to prevent `mailto:` injection.
 *
 * @param ctx - The current render context.
 * @param email - The email address string.
 */
export function renderEmail(ctx: RenderContext, email: string): void {
  // Validate email format before creating link
  if (!isValidEmail(email)) {
    // Invalid email: render as plain text
    ctx.pushEscaped(email);
    return;
  }
  ctx.push(`<a href="mailto:${escapeAttr(email)}">${escapeHtml(email)}</a>`);
}
