import type { RenderContext } from "../../context";

/**
 * Render an inline footnote reference as a superscript link.
 *
 * Produces `<sup class="footnoteref"><a id="footnoteref-N" ...>N</a></sup>`.
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
