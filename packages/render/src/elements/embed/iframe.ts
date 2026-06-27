import type { RenderContext } from "../../context";
import { escapeAttr } from "../../escape";

export function renderEmbedIframe(ctx: RenderContext, className: string, src: string): void {
  ctx.push(`<div class="${className}">`);
  ctx.push(`<iframe src="${escapeAttr(src)}" frameborder="0" allowfullscreen></iframe>`);
  ctx.push("</div>");
}
