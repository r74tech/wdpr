import type { RenderContext } from "../../context";
import type { ResolvedUser } from "../../types";
import { escapeAttr, escapeHtml } from "../../escape";

export function renderLinkedUser(ctx: RenderContext, username: string, user: ResolvedUser): void {
  const displayName = user.name ?? username;
  const hrefAttr = user.url ? ` href="${escapeAttr(user.url)}"` : "";

  ctx.push(`<span class="printuser">`);
  ctx.push(`<a${hrefAttr}>`);
  ctx.push(escapeHtml(displayName));
  ctx.push("</a>");
  ctx.push("</span>");
}

export function renderAvatarUser(ctx: RenderContext, username: string, user: ResolvedUser): void {
  const displayName = user.name ?? username;
  const hrefAttr = user.url ? ` href="${escapeAttr(user.url)}"` : "";
  const avatarUrl = user.avatarUrl ?? "";
  const styleAttr = user.karmaUrl
    ? ` style="background-image:url(${escapeAttr(user.karmaUrl)})"`
    : "";

  ctx.push(`<span class="printuser avatarhover">`);
  ctx.push(`<a${hrefAttr}>`);
  ctx.push(
    `<img class="small" src="${escapeAttr(avatarUrl)}" alt="${escapeAttr(displayName)}"${styleAttr} />`,
  );
  ctx.push("</a>");
  ctx.push(`<a${hrefAttr}>`);
  ctx.push(escapeHtml(displayName));
  ctx.push("</a>");
  ctx.push("</span>");
}
