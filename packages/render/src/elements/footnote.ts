import type { FootnoteBlockData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeHtml } from "../escape";
import { renderElements } from "../render";

/** Render a footnote reference (superscript link) */
export function renderFootnoteRef(ctx: RenderContext, index: number): void {
  ctx.push(`<sup class="footnoteref">`);
  ctx.push(`<a id="footnoteref-${index}" href="javascript:;" class="footnoteref">${index}</a>`);
  ctx.push("</sup>");
}

/** Render a footnote block */
export function renderFootnoteBlock(ctx: RenderContext, data: FootnoteBlockData): void {
  if (data.hide) return;
  if (ctx.footnotes.length === 0) return;

  const title = data.title ?? "Footnotes";

  ctx.push(`<div class="footnotes-footer">`);
  ctx.push(`<div class="title">${escapeHtml(title)}</div>`);

  // Render each footnote
  for (let i = 0; i < ctx.footnotes.length; i++) {
    const index = i + 1;
    const elements = ctx.footnotes[i] ?? [];

    ctx.push(`<div class="footnote-footer" id="footnote-${index}">`);
    ctx.push(`<a href="javascript:;">${index}</a>. `);
    renderElements(ctx, elements);
    ctx.push("</div>");
  }

  ctx.push("</div>");
}
