import type { DefinitionListItem } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderElements } from "../../render";

export function renderDefinitionList(ctx: RenderContext, items: DefinitionListItem[]): void {
  ctx.push("<dl>");
  for (const item of items) {
    ctx.push("<dt>");
    renderElements(ctx, item.key);
    ctx.push("</dt>");
    ctx.push("<dd>");
    renderElements(ctx, item.value);
    ctx.push("</dd>");
  }
  ctx.push("</dl>");
}
