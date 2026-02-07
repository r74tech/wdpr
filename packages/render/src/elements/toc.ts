import type { Element, ListData, ListItem, TableOfContentsData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeHtml } from "../escape";

/** Extract text content from a link element label */
function extractLinkText(element: Element): { href: string; text: string } | null {
  if (element.element !== "link") return null;
  const label = element.data.label;
  let text = "";
  if (typeof label === "object" && label !== null && "text" in label) {
    text = label.text;
  }
  const href = typeof element.data.link === "string" ? element.data.link : "";
  return { href, text };
}

/** Render TOC entries as flat divs with margin-left (Wikidot format) */
function renderTocEntries(ctx: RenderContext, elements: Element[]): void {
  for (const element of elements) {
    if (element.element === "list") {
      renderTocList(ctx, element.data, 1);
    }
  }
}

/** Recursively render a TOC list at a given depth */
function renderTocList(ctx: RenderContext, listData: ListData, depth: number): void {
  for (const item of listData.items) {
    renderTocItem(ctx, item, depth);
  }
}

/** Render a single TOC list item */
function renderTocItem(ctx: RenderContext, item: ListItem, depth: number): void {
  if (item["item-type"] === "elements") {
    for (const el of item.elements) {
      const link = extractLinkText(el);
      if (link) {
        ctx.push(
          `<div style="margin-left: ${depth}em;"><a href="${escapeHtml(link.href)}">${escapeHtml(link.text)}</a></div>`,
        );
      }
    }
  } else if (item["item-type"] === "sub-list") {
    renderTocList(ctx, item.data, depth + 1);
  }
}

/** Render table of contents */
export function renderTableOfContents(ctx: RenderContext, data: TableOfContentsData): void {
  const isFloat = data.align === "left" || data.align === "right";

  // Non-float: wrap in table (Wikidot behavior)
  if (!isFloat) {
    ctx.push(`<table style="margin:0; padding:0"><tr><td style="margin:0; padding:0">`);
  }

  const tocId = ctx.generateFixedId("toc");
  const tocActionBarId = ctx.generateFixedId("toc-action-bar");
  const tocListId = ctx.generateFixedId("toc-list");

  if (isFloat) {
    const floatClass = data.align === "left" ? "floatleft" : "floatright";
    ctx.push(`<div id="${tocId}" class="${floatClass}">`);
  } else {
    ctx.push(`<div id="${tocId}">`);
  }

  ctx.push(
    `<div id="${tocActionBarId}"><a href="javascript:;">Fold</a><a style="display: none" href="javascript:;">Unfold</a></div>`,
  );
  ctx.push(`<div class="title">Table of Contents</div>`);
  ctx.push(`<div id="${tocListId}">`);
  renderTocEntries(ctx, ctx.tocElements);
  ctx.push("</div>");
  ctx.push("</div>");

  if (!isFloat) {
    ctx.push(`</td></tr></table>`);
  }
}
