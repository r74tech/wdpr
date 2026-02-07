/**
 *
 * Renderer for `[[user username]]` elements.
 *
 * User elements display a username with an optional avatar image and
 * karma badge. The user profile data is resolved via the
 * `resolvers.user` callback; when no resolver is provided or the user
 * is not found, the raw username is rendered as plain text.
 *
 * The special username `"anonymous"` is always rendered as the literal
 * text "Anonymous" without any link or avatar.
 *
 * @module
 */

import type { UserData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeHtml, escapeAttr } from "../escape";

/**
 * Render a `[[user username]]` element.
 *
 * Rendering modes:
 * - "anonymous" username: plain text "Anonymous"
 * - Unresolved user: plain escaped username text
 * - Resolved without avatar: `<span class="printuser"><a>name</a></span>`
 * - Resolved with avatar: `<span class="printuser avatarhover">` with
 *   avatar image, optional karma badge, and linked display name
 *
 * @param ctx - The current render context.
 * @param data - User element data with username and show-avatar flag.
 */
export function renderUser(ctx: RenderContext, data: UserData): void {
  const normalized = data.name.toLowerCase().trim();

  // Special case: "anonymous" renders as "Anonymous" text only
  if (normalized === "anonymous") {
    ctx.push("Anonymous");
    return;
  }

  const resolved = ctx.options.resolvers?.user?.(data.name) ?? null;

  if (resolved === null) {
    // User not resolved - render as simple text
    ctx.push(escapeHtml(data.name));
    return;
  }

  const displayName = resolved.name ?? data.name;
  const hrefAttr = resolved.url ? ` href="${escapeAttr(resolved.url)}"` : "";

  // Avatar only shown when both url and avatarUrl are provided
  const showAvatar = data["show-avatar"] && resolved.url && resolved.avatarUrl;

  if (showAvatar) {
    // With avatar
    const styleAttr = resolved.karmaUrl
      ? ` style="background-image:url(${escapeAttr(resolved.karmaUrl)})"`
      : "";
    ctx.push(`<span class="printuser avatarhover">`);
    ctx.push(`<a${hrefAttr}>`);
    ctx.push(
      `<img class="small" src="${escapeAttr(resolved.avatarUrl!)}" alt="${escapeAttr(displayName)}"${styleAttr} />`,
    );
    ctx.push("</a>");
    ctx.push(`<a${hrefAttr}>`);
    ctx.push(escapeHtml(displayName));
    ctx.push("</a>");
    ctx.push("</span>");
  } else {
    // Without avatar
    ctx.push(`<span class="printuser">`);
    ctx.push(`<a${hrefAttr}>`);
    ctx.push(escapeHtml(displayName));
    ctx.push("</a>");
    ctx.push("</span>");
  }
}
