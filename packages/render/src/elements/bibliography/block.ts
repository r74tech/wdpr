import type { BibliographyBlockData, Element } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { escapeHtml } from "../../escape";

export function renderBibliographyBlock(
  ctx: RenderContext,
  data: BibliographyBlockData,
  renderElements: (ctx: RenderContext, elements: Element[]) => void,
): void {
  if (data.hide) return;

  const title = data.title ?? "Bibliography";
  ctx.push(`<div class="bibitems">`);
  ctx.push(`<div class="title">${escapeHtml(title)}</div>`);

  let index = 1;
  for (const entry of data.entries) {
    const itemId = ctx.generateId("bibitem-", index);
    ctx.push(`<div class="bibitem" id="${itemId}">`);
    ctx.push(`${index}. `);
    renderElements(ctx, entry.value);
    ctx.push("</div>");
    index++;
  }

  ctx.push("</div>");
}
