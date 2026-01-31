import type { ListData, DefinitionListItem } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, sanitizeAttributes } from "../escape";
import { renderElements } from "../render";

/** Render a list element */
export function renderList(ctx: RenderContext, data: ListData): void {
  const tag = data.type === "numbered" ? "ol" : "ul";
  ctx.push(`<${tag}${renderListAttrs(data.attributes)}>`);

  const items = data.items;
  let i = 0;
  while (i < items.length) {
    const item = items[i]!;
    if (item["item-type"] === "elements") {
      ctx.push(`<li${renderListAttrs(item.attributes)}>`);
      renderElements(ctx, item.elements);
      // Consume following sub-lists inside this <li>
      while (i + 1 < items.length && items[i + 1]!["item-type"] === "sub-list") {
        i++;
        const subItem = items[i] as { "item-type": "sub-list"; data: ListData };
        renderList(ctx, subItem.data);
      }
      ctx.push("</li>");
    } else {
      // Sub-list without preceding elements item - hide bullet/number
      const subItem = item as { "item-type": "sub-list"; data: ListData };
      ctx.push(`<li style="list-style: none; display: inline">`);
      renderList(ctx, subItem.data);
      ctx.push("</li>");
    }
    i++;
  }

  ctx.push(`</${tag}>`);
}

function renderListAttrs(attributes: Record<string, string>): string {
  const safe = sanitizeAttributes(attributes);
  let result = "";
  for (const [key, value] of Object.entries(safe)) {
    if (key.startsWith("_")) continue;
    result += ` ${key}="${escapeAttr(value)}"`;
  }
  return result;
}

/** Render a definition list */
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
