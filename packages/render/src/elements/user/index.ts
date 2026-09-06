/**
 *
 * Renderer for `[[user username]]` elements.
 *
 * @module
 */

import type { UserData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { escapeHtml } from "../../escape";
import { getResolvedUser } from "./resolve";
import { renderAvatarUser, renderLinkedUser } from "./markup";

/**
 * Render a `[[user username]]` element.
 *
 * @param ctx - The current render context.
 * @param data - User element data with username and show-avatar flag.
 */
export function renderUser(ctx: RenderContext, data: UserData): void {
  const normalized = data.name.toLowerCase().trim();

  if (normalized === "anonymous") {
    ctx.pushEscaped(ctx.messages.text("user.anonymous"));
    return;
  }

  const resolved = getResolvedUser(ctx, data.name);
  if (resolved === null) {
    ctx.push(escapeHtml(data.name));
    return;
  }

  const showAvatar = data["show-avatar"] && resolved.url && resolved.avatarUrl;
  if (showAvatar) {
    renderAvatarUser(ctx, data.name, resolved);
  } else {
    renderLinkedUser(ctx, data.name, resolved);
  }
}
