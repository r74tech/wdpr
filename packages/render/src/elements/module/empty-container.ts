import type { RenderContext } from "../../context";

export function renderEmptyModuleContainer(ctx: RenderContext, className: string): void {
  ctx.push(`<div class="${className}">`);
  ctx.push("</div>");
}

export function renderIndentedEmptyModuleContainer(ctx: RenderContext, className: string): void {
  ctx.push(`<div class="${className}">\n\t</div>`);
}
