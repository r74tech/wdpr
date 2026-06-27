import type { Alignment } from "@wdprlib/ast";
import type { RenderContext } from "../../context";

export function isFloatingToc(align: Alignment | null): boolean {
  return align === "left" || align === "right";
}

export function openTocFrame(ctx: RenderContext, align: Alignment | null): void {
  if (!isFloatingToc(align)) {
    ctx.push(`<table style="margin:0; padding:0"><tr><td style="margin:0; padding:0">`);
  }

  if (isFloatingToc(align)) {
    const floatClass = align === "left" ? "floatleft" : "floatright";
    ctx.push(`<div id="toc" class="${floatClass}">`);
  } else {
    ctx.push(`<div id="toc">`);
  }
}

export function closeTocFrame(ctx: RenderContext, align: Alignment | null): void {
  ctx.push("</div>");

  if (!isFloatingToc(align)) {
    ctx.push(`</td></tr></table>`);
  }
}
