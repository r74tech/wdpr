import { RenderContext } from "../context";

export function renderTextNode(ctx: RenderContext, text: string): void {
  ctx.pushEscaped(text);
}

export function renderLineBreak(ctx: RenderContext): void {
  ctx.push("<br />");
}

export function renderHorizontalRule(ctx: RenderContext): void {
  ctx.push("<hr />");
}

export function renderContentSeparator(ctx: RenderContext): void {
  ctx.push(`<div class="content-separator" style="display: none:"></div>`);
}
