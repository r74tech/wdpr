import type { ListData, DefinitionListItem, Element, ContainerData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, sanitizeAttributes } from "../escape";
import { renderElements, renderElement } from "../render";

/**
 * Trim leading/trailing whitespace-only text elements from an array
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
 * Check if a paragraph element contains only text that looks like [[/li]]
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
 * Render elements for _noMarker items with special Wikidot paragraph handling:
 * - First paragraph: unwrap (no <p> tag)
 * - Middle paragraphs: keep <p> tags
 * - Last paragraph if it's just [[/li]]: unwrap (no <p> tag)
 */
function renderNoMarkerElements(ctx: RenderContext, elements: Element[]): void {
  const trimmed = trimTextElements(elements);
  if (trimmed.length === 0) return;

  // Find paragraph indices
  const paragraphIndices: number[] = [];
  for (let i = 0; i < trimmed.length; i++) {
    const el = trimmed[i]!;
    if (
      el.element === "container" &&
      (el.data as ContainerData).type === "paragraph"
    ) {
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
    if (
      el.element === "container" &&
      (el.data as ContainerData).type === "paragraph"
    ) {
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

/** Render a list element */
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
