import type { UserData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeHtml, escapeAttr } from "../escape";

/** Render a user element */
export function renderUser(ctx: RenderContext, data: UserData): void {
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
    ctx.push(`<span class="printuser avatarhover">`);
    ctx.push(`<a${hrefAttr}>`);
    ctx.push(
      `<img class="small" src="${escapeAttr(resolved.avatarUrl!)}" alt="${escapeAttr(displayName)}" />`,
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
