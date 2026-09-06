/**
 *
 * Renderers for Wikidot footnote markup.
 *
 * @module
 */

import type { FootnoteBlockData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { escapeHtml } from "../../escape";
import { renderFootnoteBody } from "./body";

export { renderFootnoteRef } from "./ref";

/**
 * Render a `[[footnoteblock]]` element that lists all footnote bodies.
 *
 * If there are no footnotes, the block is not rendered at all.
 *
 * @param ctx - The current render context.
 * @param data - Footnote block data with optional custom title.
 */
export function renderFootnoteBlock(ctx: RenderContext, data: FootnoteBlockData): void {
  if (ctx.footnotes.length === 0) return;
  const title =
    data.title ?? ctx.messages.text({ id: "footnote.title", defaultMessage: "Footnotes" });

  ctx.push(`<div class="footnotes-footer">`);
  ctx.push(`<div class="title">${escapeHtml(title)}</div>`);

  for (let i = 0; i < ctx.footnotes.length; i++) {
    renderFootnoteBody(ctx, i + 1, ctx.footnotes[i] ?? []);
  }

  ctx.push("</div>");
}
