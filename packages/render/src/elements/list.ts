/**
 *
 * Renderers for Wikidot ordered/unordered lists and definition lists.
 *
 * Wikidot list syntax uses `*` (unordered) and `#` (ordered) prefixes
 * with indentation controlling nesting depth. The parser produces a
 * recursive `ListData` structure with items that can be either
 * "elements" (content) or "sub-list" (nested list).
 *
 * Special behaviors replicated from Wikidot:
 * - Empty lists are silently dropped (no output at all).
 * - Items with `_noMarker` have `list-style: none` and the first
 *   paragraph is unwrapped (no `<p>` tags).
 * - Sub-lists without a preceding content item get an inline hidden `<li>`.
 * - Leading/trailing whitespace-only text nodes are trimmed from items.
 *
 * @module
 */

import type { ListData, DefinitionListItem, Element, ContainerData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, sanitizeAttributes } from "../escape";
import { renderElements, renderElement } from "../render";

/**
 * Trim leading and trailing whitespace-only text elements from an array.
 *
 * @param elements - Array of AST elements.
 * @returns A slice of the array with whitespace-only text nodes removed
 *   from both ends.
 */
function trimTextElements(elements: Element[]): Element[] {
  if (elements.length === 0) return elements;

  let start = 0;
  let end = elements.length;

  // Trim leading whitespace-only text elements
  while (start < end) {
    const el = elements[start]!;
    if (el.element === "text" && typeof el.data === "string" && el.data.trim() === "") {
      start++;
    } else {
      break;
    }
  }

  // Trim trailing whitespace-only text elements
  while (end > start) {
    const el = elements[end - 1]!;
    if (el.element === "text" && typeof el.data === "string" && el.data.trim() === "") {
      end--;
    } else {
      break;
    }
  }

  return elements.slice(start, end);
}

/**
 * Check whether a paragraph element contains only the text `[[/li]]`.
 *
 * The parser sometimes wraps stray `[[/li]]` closing tags in a paragraph.
 * When found as the last paragraph in a `_noMarker` item, the paragraph
 * wrapper is removed to match Wikidot output.
 *
 * @param el - An AST element to check.
 * @returns `true` if the element is a paragraph containing only `[[/li]]`.
 */
function isLiCloseTextParagraph(el: Element): boolean {
  if (el.element !== "container") return false;
  const data = el.data as ContainerData;
  if (data.type !== "paragraph") return false;
  // Check if content is just [[/li]] (possibly with whitespace)
  const texts = data.elements
    .filter((e): e is { element: "text"; data: string } => e.element === "text")
    .map((e) => e.data);
  const combined = texts.join("").trim();
  return combined === "[[/li]]";
}

/**
 * Render elements for `_noMarker` list items with special paragraph handling.
 *
 * Wikidot treats bare content (without `[[li]]`) differently:
 * - The first paragraph is unwrapped (children rendered without `<p>` tags).
 * - Middle paragraphs retain their `<p>` wrappers.
 * - The last paragraph is unwrapped if it contains only `[[/li]]` text.
 *
 * @param ctx - The current render context.
 * @param elements - The list item's child elements.
 */
function renderNoMarkerElements(ctx: RenderContext, elements: Element[]): void {
  const trimmed = trimTextElements(elements);
  if (trimmed.length === 0) return;

  // Find paragraph indices
  const paragraphIndices: number[] = [];
  for (let i = 0; i < trimmed.length; i++) {
    const el = trimmed[i]!;
    if (el.element === "container" && (el.data as ContainerData).type === "paragraph") {
      paragraphIndices.push(i);
    }
  }

  // If no paragraphs, render normally
  if (paragraphIndices.length === 0) {
    renderElements(ctx, trimmed);
    return;
  }

  const firstParagraphIdx = paragraphIndices[0]!;
  const lastParagraphIdx = paragraphIndices[paragraphIndices.length - 1]!;

  for (let i = 0; i < trimmed.length; i++) {
    const el = trimmed[i]!;
    if (el.element === "container" && (el.data as ContainerData).type === "paragraph") {
      const data = el.data as ContainerData;
      // First paragraph: unwrap
      if (i === firstParagraphIdx) {
        renderElements(ctx, data.elements);
      }
      // Last paragraph if it's [[/li]]: unwrap
      else if (i === lastParagraphIdx && isLiCloseTextParagraph(el)) {
        renderElements(ctx, data.elements);
      }
      // Other paragraphs: keep <p> tags
      else {
        ctx.push("<p>");
        renderElements(ctx, data.elements);
        ctx.push("</p>");
      }
    } else {
      renderElement(ctx, el);
    }
  }
}

/**
 * Render an ordered or unordered list.
 *
 * Wikidot drops empty lists entirely (no HTML output). Sub-lists
 * following a content item are rendered inside the same `<li>`.
 * Sub-lists without a preceding content item get a hidden `<li>` wrapper.
 *
 * @param ctx - The current render context.
 * @param data - List data with type (numbered/bulleted), items, and attributes.
 */
export function renderList(ctx: RenderContext, data: ListData): void {
  // Wikidot behavior: empty lists or lists with only empty items are ignored
  // and converted to <br />
  const hasContent = data.items.some((item) => {
    if (item["item-type"] === "sub-list") return true;
    if (item["item-type"] === "elements") {
      const trimmed = trimTextElements(item.elements);
      return trimmed.length > 0;
    }
    return false;
  });

  if (!hasContent) {
    // Empty list - Wikidot outputs nothing (just whitespace)
    return;
  }

  const tag = data.type === "numbered" ? "ol" : "ul";
  ctx.push(`<${tag}${renderListAttrs(data.attributes)}>`);

  const items = data.items;
  let i = 0;
  while (i < items.length) {
    const item = items[i]!;
    if (item["item-type"] === "elements") {
      // Check for _noMarker flag (bare content without [[li]])
      const hasNoMarker = item.attributes._noMarker === "true";
      const styleAttr = hasNoMarker ? ' style="list-style: none"' : "";
      ctx.push(`<li${renderListAttrs(item.attributes)}${styleAttr}>`);
      // Trim leading/trailing whitespace from li content (Wikidot behavior)
      if (hasNoMarker) {
        // Special handling for bare content paragraphs
        renderNoMarkerElements(ctx, item.elements);
      } else {
        renderElements(ctx, trimTextElements(item.elements));
      }
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

/**
 * Sanitize and render list-specific attributes, excluding internal `_`-prefixed keys.
 *
 * @param attributes - Raw attribute map from the AST.
 * @returns An HTML attribute string with leading space, or `""` if empty.
 */
function renderListAttrs(attributes: Record<string, string>): string {
  const safe = sanitizeAttributes(attributes);
  let result = "";
  for (const [key, value] of Object.entries(safe)) {
    if (key.startsWith("_")) continue;
    result += ` ${key}="${escapeAttr(value)}"`;
  }
  return result;
}

/**
 * Render a definition list (`:`-prefixed items in Wikidot markup).
 *
 * Produces `<dl>` with `<dt>`/`<dd>` pairs for each definition item.
 *
 * @param ctx - The current render context.
 * @param items - Array of definition list items, each with key and value elements.
 */
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
