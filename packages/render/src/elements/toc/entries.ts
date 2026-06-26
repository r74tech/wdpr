import type { Element, ListData, ListItem } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { escapeAttr, escapeHtml } from "../../escape";
import { extractTocLink, rewriteTocAnchor } from "./link";

export function renderTocEntries(ctx: RenderContext, elements: Element[]): void {
  for (const element of elements) {
    if (element.element === "list") {
      renderTocList(ctx, element.data, 1);
    }
  }
}

function renderTocList(ctx: RenderContext, listData: ListData, depth: number): void {
  for (const item of listData.items) {
    renderTocItem(ctx, item, depth);
  }
}

function renderTocItem(ctx: RenderContext, item: ListItem, depth: number): void {
  if (item["item-type"] === "elements") {
    for (const el of item.elements) {
      const link = extractTocLink(el);
      if (link) {
        const href = rewriteTocAnchor(ctx, link.href);
        ctx.push(
          `<div style="margin-left: ${depth}em;"><a href="${escapeAttr(href)}">${escapeHtml(link.text)}</a></div>`,
        );
      }
    }
  } else if (item["item-type"] === "sub-list") {
    renderTocList(ctx, item.data, depth + 1);
  }
}
