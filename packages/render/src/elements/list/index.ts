/**
 *
 * Renderers for Wikidot ordered/unordered lists and definition lists.
 *
 * Wikidot list syntax uses `*` (unordered) and `#` (ordered) prefixes
 * with indentation controlling nesting depth. The parser produces a
 * recursive `ListData` structure with items that can be either
 * "elements" (content) or "sub-list" (nested list).
 *
 * @module
 */

import type { ListData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderDefinitionList } from "./definition-list";
import { renderListAttrs } from "./attributes";
import { renderListItems } from "./items";
import { hasNonWhitespaceElement } from "./trim";

export { renderDefinitionList };

/**
 * Render an ordered or unordered list.
 *
 * Wikidot drops empty lists entirely (no HTML output). Sub-lists
 * following a content item are rendered inside the same `<li>`.
 * Sub-lists without a preceding content item get a hidden `<li>` wrapper.
 */
export function renderList(ctx: RenderContext, data: ListData): void {
  const hasContent = data.items.some((item) => {
    if (item["item-type"] === "sub-list") return true;
    if (item["item-type"] === "elements") {
      return hasNonWhitespaceElement(item.elements);
    }
    return false;
  });

  if (!hasContent) {
    return;
  }

  const tag = data.type === "numbered" ? "ol" : "ul";
  ctx.push(`<${tag}${renderListAttrs(data.attributes)}>`);

  renderListItems(ctx, data.items, renderList);

  ctx.push(`</${tag}>`);
}
