/**
 * @module elements/toc
 *
 * Renderer for `[[toc]]` (Table of Contents) elements.
 *
 * The table of contents is built from the pre-collected `tocElements`
 * in the render context (populated from the `table-of-contents` field
 * of the syntax tree). Each entry is rendered as a `<div>` with
 * `margin-left` indentation based on heading depth, matching Wikidot's
 * flat-div TOC format.
 *
 * The TOC supports fold/unfold toggling via a `#toc-action-bar` with
 * Fold/Unfold links, handled at runtime by the `toc` runtime module.
 * Alignment options (`left`/`right`) produce a floated container.
 */

import type { Element, ListData, ListItem, TableOfContentsData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, escapeHtml } from "../escape";

/**
 * Extract text content and href from a link element for TOC rendering.
 *
 * @param element - An AST element (expected to be a link).
 * @returns An object with `href` and `text`, or `null` if not a link.
 */
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

/**
 * Render TOC entries as flat `<div>` elements with `margin-left` indentation.
 *
 * @param ctx - The current render context.
 * @param elements - Top-level TOC elements (expected to contain list elements).
 */
function renderTocEntries(ctx: RenderContext, elements: Element[]): void {
  for (const element of elements) {
    if (element.element === "list") {
      renderTocList(ctx, element.data, 1);
    }
  }
}

/**
 * Recursively render a TOC list at a given nesting depth.
 *
 * @param ctx - The current render context.
 * @param listData - The list data representing this level of the TOC.
 * @param depth - Current nesting depth (1-based), used for `margin-left` calculation.
 */
function renderTocList(ctx: RenderContext, listData: ListData, depth: number): void {
  for (const item of listData.items) {
    renderTocItem(ctx, item, depth);
  }
}

/**
 * Rewrite a TOC anchor `href` (e.g., `"#toc0"`) so that it matches
 * the rendered heading's actual ID.
 *
 * When `useTrueIds` is false, heading IDs have a random suffix appended
 * (e.g., `toc0-a1b2c3`). This function regenerates the ID through the
 * context to ensure the TOC link targets the correct heading.
 *
 * @param ctx - The current render context.
 * @param href - The original href from the TOC link (e.g., `"#toc0"`).
 * @returns The rewritten href with the correct ID.
 */
function rewriteTocAnchor(ctx: RenderContext, href: string): string {
  const match = /^#toc(\d+)$/.exec(href);
  if (!match) return href;
  return `#${ctx.generateId("toc", Number(match[1]))}`;
}

/**
 * Render a single TOC list item as a `<div>` with indented margin.
 *
 * @param ctx - The current render context.
 * @param item - The list item (elements or sub-list).
 * @param depth - Current nesting depth for margin calculation.
 */
function renderTocItem(ctx: RenderContext, item: ListItem, depth: number): void {
  if (item["item-type"] === "elements") {
    for (const el of item.elements) {
      const link = extractLinkText(el);
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

/**
 * Render a `[[toc]]` table of contents block.
 *
 * Non-floating TOC is wrapped in a `<table>` for Wikidot layout compatibility.
 * Floating TOC (align `left` or `right`) uses a `<div>` with a float class.
 *
 * The TOC container uses fixed IDs (`#toc`, `#toc-action-bar`, `#toc-list`)
 * that the runtime `toc` module queries for fold/unfold toggling.
 *
 * @param ctx - The current render context.
 * @param data - TOC configuration data with optional alignment.
 */
export function renderTableOfContents(ctx: RenderContext, data: TableOfContentsData): void {
  const isFloat = data.align === "left" || data.align === "right";

  // Non-float: wrap in table (Wikidot behavior)
  if (!isFloat) {
    ctx.push(`<table style="margin:0; padding:0"><tr><td style="margin:0; padding:0">`);
  }

  // TOC container IDs are fixed — the runtime queries them by ID (#toc, #toc-action-bar, #toc-list)
  if (isFloat) {
    const floatClass = data.align === "left" ? "floatleft" : "floatright";
    ctx.push(`<div id="toc" class="${floatClass}">`);
  } else {
    ctx.push(`<div id="toc">`);
  }

  ctx.push(
    `<div id="toc-action-bar"><a href="javascript:;">Fold</a><a style="display: none" href="javascript:;">Unfold</a></div>`,
  );
  ctx.push(`<div class="title">Table of Contents</div>`);
  ctx.push(`<div id="toc-list">`);
  renderTocEntries(ctx, ctx.tocElements);
  ctx.push("</div>");
  ctx.push("</div>");

  if (!isFloat) {
    ctx.push(`</td></tr></table>`);
  }
}
