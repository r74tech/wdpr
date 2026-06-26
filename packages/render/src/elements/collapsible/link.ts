import type { RenderContext } from "../../context";

export function renderCollapsibleLink(ctx: RenderContext, label: string): void {
  ctx.push(`<a class="collapsible-block-link" href="javascript:;">${label}</a>`);
}

export function renderHideLink(ctx: RenderContext, label: string): void {
  ctx.push(`<div class="collapsible-block-unfolded-link">`);
  renderCollapsibleLink(ctx, label);
  ctx.push("</div>");
}
