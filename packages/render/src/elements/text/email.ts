import type { RenderContext } from "../../context";
import { escapeAttr, escapeHtml, isValidEmail } from "../../escape";

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
  if (!isValidEmail(email)) {
    ctx.pushEscaped(email);
    return;
  }

  ctx.push(`<a href="mailto:${escapeAttr(email)}">${escapeHtml(email)}</a>`);
}
