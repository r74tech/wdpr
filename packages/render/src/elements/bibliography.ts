import type { BibliographyCiteData, BibliographyBlockData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeHtml } from "../escape";

/** Render bibliography cite */
export function renderBibliographyCite(ctx: RenderContext, data: BibliographyCiteData): void {
  if (data.brackets) {
    ctx.push("[");
  }
  ctx.push(`<a class="bibcite" href="javascript:;">`);
  ctx.push(escapeHtml(data.label));
  ctx.push("</a>");
  if (data.brackets) {
    ctx.push("]");
  }
}

/** Render bibliography block */
export function renderBibliographyBlock(ctx: RenderContext, data: BibliographyBlockData): void {
  if (data.hide) return;

  const title = data.title ?? "Bibliography";

  ctx.push(`<div class="bibitems">`);
  ctx.push(`<div class="title">${escapeHtml(title)}</div>`);
  ctx.push("</div>");
}
