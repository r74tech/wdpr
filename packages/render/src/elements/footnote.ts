/**
 * @module elements/footnote
 *
 * Renderers for Wikidot footnote markup.
 *
 * - `[[footnote]]...[[/footnote]]` -- inline footnote reference that renders
 *   as a superscript number linking to the footnote body.
 * - `[[footnoteblock]]` -- block element that lists all footnote bodies
 *   collected during the render pass.
 *
 * The runtime `footnote` module adds hover tooltips and click-to-scroll
 * behavior to these elements.
 */

import type { FootnoteBlockData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeHtml } from "../escape";
import { renderElements } from "../render";

/**
 * Render an inline footnote reference as a superscript link.
 *
 * Produces `<sup class="footnoteref"><a id="footnoteref-N" ...>N</a></sup>`.
 * The ID is used by the runtime module for bidirectional scroll navigation
 * between the reference and its footnote body.
 *
 * @param ctx - The current render context.
 * @param index - The 1-based footnote number.
 */
export function renderFootnoteRef(ctx: RenderContext, index: number): void {
  const id = ctx.generateId("footnoteref-", index);
  ctx.push(`<sup class="footnoteref">`);
  ctx.push(`<a id="${id}" href="javascript:;" class="footnoteref">${index}</a>`);
  ctx.push("</sup>");
}

/**
 * Render a `[[footnoteblock]]` element that lists all footnote bodies.
 *
 * Produces a Wikidot-compatible structure:
 * ```html
 * <div class="footnotes-footer">
 *   <div class="title">Footnotes</div>
 *   <div class="footnote-footer" id="footnote-1">
 *     <a href="javascript:;">1</a>. ...content...
 *   </div>
 * </div>
 * ```
 *
 * If there are no footnotes, the block is not rendered at all.
 *
 * @param ctx - The current render context.
 * @param data - Footnote block data with optional custom title.
 */
export function renderFootnoteBlock(ctx: RenderContext, data: FootnoteBlockData): void {
  if (ctx.footnotes.length === 0) return;
  const title = data.title ?? "Footnotes";

  ctx.push(`<div class="footnotes-footer">`);
  ctx.push(`<div class="title">${escapeHtml(title)}</div>`);

  // Render each footnote
  for (let i = 0; i < ctx.footnotes.length; i++) {
    const index = i + 1;
    const elements = ctx.footnotes[i] ?? [];

    const fnId = ctx.generateId("footnote-", index);
    ctx.push(`<div class="footnote-footer" id="${fnId}">`);
    ctx.push(`<a href="javascript:;">${index}</a>. `);
    renderElements(ctx, elements);
    ctx.push("</div>");
  }

  ctx.push("</div>");
}
