import type { Element } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderElements } from "../../render";

export function renderFootnoteBody(ctx: RenderContext, index: number, elements: Element[]): void {
  const fnId = ctx.generateId("footnote-", index);
  ctx.push(`<div class="footnote-footer" id="${fnId}">`);
  ctx.push(`<a href="javascript:;">${index}</a>. `);
  renderElements(ctx, elements);
  ctx.push("</div>");
}
