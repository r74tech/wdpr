/**
 * @module elements/container
 *
 * Renderer for "container" AST elements -- the most general wrapper node
 * in the Wikidot AST.
 *
 * A container can represent many different HTML constructs depending on
 * its `type` discriminant:
 * - Headers (`h1`..`h6`) with optional TOC anchor IDs
 * - Text alignment wrappers (`left`, `center`, `right`, `justify`)
 * - Inline formatting (`bold`, `italics`, `underline`, `strikethrough`,
 *   `superscript`, `subscript`, `monospace`, `mark`, `insertion`, `deletion`)
 * - Block containers (`paragraph`, `div`, `blockquote`, `span`)
 * - Visibility modifiers (`hidden`, `invisible`)
 * - Ruby annotations (`ruby`, `ruby-text`)
 * - Definition lists (`definition-list`, `definition-list-item`, etc.)
 * - Table sub-elements (`table-row`, `table-cell`)
 * - Size containers with inline `font-size` styling
 *
 * All attributes are sanitized before rendering to prevent XSS.
 */

import type { ContainerData } from "@wdprlib/ast";
import { isStringContainerType, isHeaderType, isAlignType } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, sanitizeAttributes } from "../escape";
import { renderElements } from "../render";

/**
 * Render a container element by dispatching on its `type` discriminant.
 *
 * Headers, alignment wrappers, and string-typed containers each follow
 * different rendering paths. Unknown container types render their
 * children without a wrapping element.
 *
 * @param ctx - The current render context.
 * @param data - Container data including type, attributes, and child elements.
 */
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

/**
 * Render a heading element (`h1`..`h6`).
 *
 * When the heading participates in the table of contents (`hasToc` is true),
 * a `toc{N}` ID attribute is generated so that TOC links can target it.
 * The heading content is wrapped in a `<span>` to match Wikidot's output.
 *
 * @param ctx - The current render context.
 * @param level - Heading level (1-6).
 * @param hasToc - Whether this heading has a corresponding TOC entry.
 * @param attributes - Sanitized HTML attributes from the AST.
 * @param elements - Child elements to render inside the heading.
 */
function renderHeader(
  ctx: RenderContext,
  level: number,
  hasToc: boolean,
  attributes: Record<string, string>,
  elements: import("@wdprlib/ast").Element[],
): void {
  const tag = `h${level}`;
  if (hasToc) {
    const tocId = ctx.generateId("toc", ctx.nextTocIndex());
    ctx.push(`<${tag} id="${tocId}"${renderAttrs(attributes)}>`);
  } else {
    ctx.push(`<${tag}${renderAttrs(attributes)}>`);
  }
  ctx.push("<span>");
  renderElements(ctx, elements);
  ctx.push("</span>");
  ctx.push(`</${tag}>`);
}

/**
 * Render a container whose type is a plain string identifier.
 *
 * Dispatches to the appropriate HTML element based on the type string.
 * Each case wraps child elements in the correct HTML tag with sanitized
 * attributes. Empty divs without attributes are skipped (matching Wikidot).
 *
 * @param ctx - The current render context.
 * @param type - Container type string (e.g. "paragraph", "bold", "div").
 * @param attributes - Sanitized HTML attributes from the AST.
 * @param elements - Child elements to render inside the container.
 */
function renderStringContainer(
  ctx: RenderContext,
  type: string,
  attributes: Record<string, string>,
  elements: import("@wdprlib/ast").Element[],
): void {
  switch (type) {
    case "paragraph":
      ctx.push(`<p${renderAttrs(attributes)}>`);
      renderElements(ctx, elements);
      ctx.push("</p>");
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

/**
 * Render a `[[size]]` container element.
 *
 * The font size value is expected to be pre-encoded in the `style`
 * attribute as a `font-size` declaration by the parser. The element
 * is rendered as a `<span>` with the full attribute set.
 *
 * @param ctx - The current render context.
 * @param attributes - Attributes including the `style` with `font-size`.
 * @param elements - Child elements to render inside the span.
 */
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

/**
 * Sanitize and format an attribute map into an HTML attribute string.
 *
 * Internal attributes (prefixed with `_`) are excluded from the output.
 *
 * @param attributes - Raw attribute map from the AST.
 * @returns An HTML attribute string with a leading space, or `""` if empty.
 */
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
