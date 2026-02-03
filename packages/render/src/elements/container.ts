import type { ContainerData, Element } from "@wdprlib/ast";
import { isStringContainerType, isHeaderType, isAlignType } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, sanitizeAttributes } from "../escape";
import { renderElements } from "../render";

/**
 * Check if elements contain an inline image (image without alignment)
 * Wikidot skips <p> tags for paragraphs containing inline images
 */
function hasInlineImage(elements: Element[]): boolean {
  for (const elem of elements) {
    if (elem.element === "image") {
      const data = (elem as any).data;
      // Inline image = no alignment (alignment is null or undefined)
      if (data?.alignment == null) {
        return true;
      }
    }
  }
  return false;
}

/** Render a container element */
export function renderContainer(ctx: RenderContext, data: ContainerData): void {
  const { type, attributes, elements } = data;

  if (isHeaderType(type)) {
    renderHeader(ctx, type.header.level, type.header["has-toc"], attributes, elements);
    return;
  }

  if (isAlignType(type)) {
    ctx.push(`<div style="text-align: ${type.align};">`);
    renderElements(ctx, elements);
    ctx.push("</div>");
    return;
  }

  if (isStringContainerType(type)) {
    renderStringContainer(ctx, type, attributes, elements);
  }
}

function renderHeader(
  ctx: RenderContext,
  level: number,
  hasToc: boolean,
  attributes: Record<string, string>,
  elements: import("@wdprlib/ast").Element[],
): void {
  const tag = `h${level}`;
  if (hasToc) {
    const tocId = ctx.nextTocIndex();
    ctx.push(`<${tag} id="toc${tocId}"${renderAttrs(attributes)}>`);
  } else {
    ctx.push(`<${tag}${renderAttrs(attributes)}>`);
  }
  ctx.push("<span>");
  renderElements(ctx, elements);
  ctx.push("</span>");
  ctx.push(`</${tag}>`);
}

function renderStringContainer(
  ctx: RenderContext,
  type: string,
  attributes: Record<string, string>,
  elements: import("@wdprlib/ast").Element[],
): void {
  switch (type) {
    case "paragraph":
      // Wikidot: paragraphs containing inline images (no alignment) skip <p> tags
      if (hasInlineImage(elements)) {
        renderElements(ctx, elements);
      } else {
        ctx.push(`<p${renderAttrs(attributes)}>`);
        renderElements(ctx, elements);
        ctx.push("</p>");
      }
      break;
    case "bold":
      ctx.push(`<strong${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</strong>");
      break;
    case "italics":
      ctx.push(`<em${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</em>");
      break;
    case "underline":
      ctx.push(`<span style="text-decoration: underline;"${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</span>");
      break;
    case "strikethrough":
      ctx.push(`<span style="text-decoration: line-through;"${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</span>");
      break;
    case "superscript":
      ctx.push(`<sup${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</sup>");
      break;
    case "subscript":
      ctx.push(`<sub${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</sub>");
      break;
    case "monospace":
      ctx.push(`<tt${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</tt>");
      break;
    case "span":
      ctx.push(`<span${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</span>");
      break;
    case "div":
      // Wikidot skips empty divs without attributes
      if (elements.length === 0 && Object.keys(attributes).length === 0) {
        break;
      }
      ctx.push(`<div${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</div>");
      break;
    case "blockquote":
      ctx.push(`<blockquote${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</blockquote>");
      break;
    case "mark":
      ctx.push(`<mark${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</mark>");
      break;
    case "insertion":
      ctx.push(`<ins${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</ins>");
      break;
    case "deletion":
      ctx.push(`<del${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</del>");
      break;
    case "size":
      // Size uses style attribute with font-size
      renderSizeContainer(ctx, attributes, elements);
      break;
    case "hidden":
      ctx.push(`<span style="display: none"${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</span>");
      break;
    case "invisible":
      ctx.push(`<span style="visibility: hidden"${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</span>");
      break;
    case "ruby":
      ctx.push(`<ruby${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</ruby>");
      break;
    case "ruby-text":
      ctx.push(`<rt${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</rt>");
      break;
    case "heading":
      // Heading as container type (used in definition-list context)
      renderElements(ctx, elements);
      break;
    case "collapsible":
      // Collapsible as container type
      renderElements(ctx, elements);
      break;
    case "definition-list":
      ctx.push("<dl>");
      renderElements(ctx, elements);
      ctx.push("</dl>");
      break;
    case "definition-list-item":
      renderElements(ctx, elements);
      break;
    case "definition-list-key":
      ctx.push("<dt>");
      renderElements(ctx, elements);
      ctx.push("</dt>");
      break;
    case "definition-list-value":
      ctx.push("<dd>");
      renderElements(ctx, elements);
      ctx.push("</dd>");
      break;
    case "table-row":
      ctx.push(`<tr${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</tr>");
      break;
    case "table-cell":
      ctx.push(`<td${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</td>");
      break;
    default:
      // Unknown container types: just render children
      renderElements(ctx, elements);
  }
}

function renderSizeContainer(
  ctx: RenderContext,
  attributes: Record<string, string>,
  elements: import("@wdprlib/ast").Element[],
): void {
  const style = attributes.style ?? "";
  // The size value is stored in the style attribute as font-size
  const existingAttrs = { ...attributes };
  if (!style.includes("font-size")) {
    // Fallback: render without font-size if not in style
    ctx.push(`<span${renderAttrs(existingAttrs)}>`);
  } else {
    ctx.push(`<span${renderAttrs(existingAttrs)}>`);
  }
  renderElements(ctx, elements);
  ctx.push("</span>");
}

function renderAttrs(attributes: Record<string, string>): string {
  const safe = sanitizeAttributes(attributes);
  let result = "";
  for (const [key, value] of Object.entries(safe)) {
    // Skip internal attributes
    if (key.startsWith("_")) continue;
    if (value !== "") {
      result += ` ${key}="${escapeAttr(value)}"`;
    } else {
      result += ` ${key}=""`;
    }
  }
  return result;
}
