import type { ContainerData, Alignment, Element } from "@wdprlib/ast";
import { isHeaderType, isAlignType, isStringContainerType } from "@wdprlib/ast";
import { SerializeContext } from "./context";
import { serializeElement, serializeElements } from "./serialize-element";

/**
 * Serialize a container element by dispatching on its type.
 *
 * Handles headings, alignment blocks, string-typed containers (paragraph,
 * bold, italics, etc.), and extended types (mark, insertion, deletion, ruby).
 */
export function serializeContainer(ctx: SerializeContext, data: ContainerData): void {
  const { type, elements, attributes } = data;

  if (isHeaderType(type)) {
    serializeHeading(ctx, type.header.level, type.header["has-toc"], elements);
    return;
  }

  if (isAlignType(type)) {
    serializeAlignment(ctx, type.align, elements);
    return;
  }

  if (isStringContainerType(type)) {
    serializeStringContainer(ctx, type, elements, attributes);
    return;
  }

  // Extended types (mark, insertion, deletion, ruby, ruby-text)
  const typeStr = type as unknown as string;
  switch (typeStr) {
    case "mark":
    case "insertion":
    case "deletion":
      serializeSpanLike(ctx, typeStr, elements, attributes);
      return;
    case "ruby":
      serializeElements(ctx, elements);
      return;
    case "ruby-text":
      serializeElements(ctx, elements);
      return;
    default:
      serializeElements(ctx, elements);
  }
}

/**
 * Serialize a heading container using `+` prefix syntax.
 *
 * Uses inline serialization so the heading content is on a single line.
 */
function serializeHeading(
  ctx: SerializeContext,
  level: number,
  hasToc: boolean,
  elements: Element[],
): void {
  const prefix = "+".repeat(level);
  const tocMarker = hasToc ? "" : "*";
  ctx.pushBlockLine(prefix + tocMarker + " " + serializeInline(ctx, elements));
  ctx.requestBlankLine();
}

/**
 * Serialize an alignment container to `[[=]]...[[/=]]` (or `>`, `<`, `==`) syntax.
 */
function serializeAlignment(ctx: SerializeContext, align: Alignment, elements: Element[]): void {
  const tag = alignTag(align);
  ctx.pushBlockLine(`[[${tag}]]`);
  const inner = serializeBlockInner(ctx, elements);
  ctx.push(inner);
  ctx.pushBlockLine(`[[/${tag}]]`);
  ctx.requestBlankLine();
}

/** Map an alignment value to its Wikidot tag character(s). */
function alignTag(align: Alignment): string {
  switch (align) {
    case "center":
      return "=";
    case "right":
      return ">";
    case "left":
      return "<";
    case "justify":
      return "==";
  }
}

/**
 * Serialize a string-typed container (paragraph, bold, italics, underline,
 * strikethrough, superscript, subscript, monospace, span, div, blockquote, size).
 */
function serializeStringContainer(
  ctx: SerializeContext,
  type: string,
  elements: Element[],
  attributes: Record<string, string>,
): void {
  switch (type) {
    case "paragraph": {
      // Single-line centering: style="text-align: center;" → = text
      const style = attributes.style ?? "";
      const prevInParagraph = ctx.inParagraph;
      ctx.inParagraph = true;
      if (style === "text-align: center;") {
        ctx.pushBlockLine("= " + serializeInline(ctx, elements));
        ctx.requestParagraphBlankLine();
      } else {
        serializeElements(ctx, elements);
        ctx.push(ctx.newline);
        ctx.requestParagraphBlankLine();
      }
      ctx.inParagraph = prevInParagraph;
      break;
    }
    case "bold":
      ctx.push("**");
      serializeElements(ctx, elements);
      ctx.push("**");
      break;
    case "italics":
      ctx.push("//");
      serializeElements(ctx, elements);
      ctx.push("//");
      break;
    case "underline":
      ctx.push("__");
      serializeElements(ctx, elements);
      ctx.push("__");
      break;
    case "strikethrough":
      ctx.push("--");
      serializeElements(ctx, elements);
      ctx.push("--");
      break;
    case "superscript":
      ctx.push("^^");
      serializeElements(ctx, elements);
      ctx.push("^^");
      break;
    case "subscript":
      ctx.push(",,");
      serializeElements(ctx, elements);
      ctx.push(",,");
      break;
    case "monospace":
      ctx.push("{{");
      serializeElements(ctx, elements);
      ctx.push("}}");
      break;
    case "span":
      if (!ctx.inParagraph) {
        serializeBlockSpan(ctx, elements, attributes);
      } else {
        serializeSpanLike(ctx, "span", elements, attributes);
      }
      break;
    case "div":
      serializeDivContainer(ctx, elements, attributes);
      break;
    case "blockquote":
      serializeBlockquote(ctx, elements);
      break;
    case "size":
      serializeSizeContainer(ctx, elements, attributes);
      break;
    default:
      serializeElements(ctx, elements);
  }
}

/**
 * Serialize a span-like container to `[[span attrs]]content[[/span]]` syntax.
 *
 * For non-span types (mark, insertion, deletion), the type is set as
 * the `class` attribute.
 */
function serializeSpanLike(
  ctx: SerializeContext,
  type: string,
  elements: Element[],
  attributes: Record<string, string>,
): void {
  const attrs = { ...attributes };
  if (type !== "span") {
    attrs.class = type;
  }
  const attrStr = formatAttributes(attrs);
  ctx.push(`[[span${attrStr}]]`);
  serializeElements(ctx, elements);
  ctx.push("[[/span]]");
}

/**
 * Serialize a block-level span_ (outside paragraphs).
 *
 * The inner content is serialized in an inline (paragraph) context to
 * prevent nested spans from becoming block-level span_.
 */
function serializeBlockSpan(
  ctx: SerializeContext,
  elements: Element[],
  attributes: Record<string, string>,
): void {
  const attrStr = formatAttributes(attributes);
  // Serialize content in inline context (nested spans stay inline, not span_)
  const innerCtx = new SerializeContext({ newline: ctx.newline });
  innerCtx.inParagraph = true;
  serializeElements(innerCtx, elements);
  const content = innerCtx.getOutput().replace(/\n$/, "");
  ctx.pushBlockLine(`[[span_${attrStr}]]${content}[[/span]]`);
  ctx.requestParagraphBlankLine();
}

/**
 * Serialize a div container.
 *
 * Uses `div_` (paragraph-strip) when the first or last child is inline text
 * content (indicating `unwrapEdgeParagraphs` was applied), and `div` (normal)
 * otherwise.
 *
 * Only text-like inline elements (text, line-break, inline formatting, links,
 * etc.) trigger `div_`. Non-text inline elements like `image` do not, because
 * they can appear without `<p>` wrapping in `[[div]]` too (e.g. Wikidot
 * renders `[[image]]` inside `[[div]]` without a `<p>` wrapper).
 */
function serializeDivContainer(
  ctx: SerializeContext,
  elements: Element[],
  attributes: Record<string, string>,
): void {
  const attrStr = formatAttributes(attributes);

  // div_ detection: first or last child is inline text content → paragraph-strip
  const isParagraphStrip =
    elements.length > 0 &&
    (isInlineTextElement(elements[0]!) || isInlineTextElement(elements[elements.length - 1]!));

  const openTag = isParagraphStrip ? "div_" : "div";
  ctx.pushBlockLine(`[[${openTag}${attrStr}]]`);

  if (isParagraphStrip) {
    const inner = serializeDivStripInner(ctx, elements);
    ctx.push(inner);
  } else {
    const inner = serializeBlockInner(ctx, elements);
    ctx.push(inner);
  }

  ctx.pushBlockLine("[[/div]]");
  ctx.requestBlankLine();
}

/**
 * Serialize the content of a `div_` (paragraph-strip) container.
 *
 * Consecutive inline elements are treated as implicit paragraphs.
 * Block elements are serialized normally.
 */
function serializeDivStripInner(parentCtx: SerializeContext, elements: Element[]): string {
  const innerCtx = new SerializeContext({ newline: parentCtx.newline });

  let i = 0;
  while (i < elements.length) {
    const el = elements[i]!;

    if (isBlockLevelElement(el)) {
      // Block element: serialize directly (handles its own newlines)
      serializeElement(innerCtx, el);
      i++;
    } else {
      // Consecutive inline elements → implicit paragraph
      while (i < elements.length && !isBlockLevelElement(elements[i]!)) {
        serializeElement(innerCtx, elements[i]!);
        i++;
      }
      innerCtx.push(innerCtx.newline);
      innerCtx.requestParagraphBlankLine();
    }
  }

  return innerCtx.getBlockInnerOutput();
}

/** Check whether an AST element is block-level (used by serializeDivStripInner). */
function isBlockLevelElement(el: Element): boolean {
  switch (el.element) {
    case "container": {
      const type = (el.data as ContainerData)?.type;
      if (typeof type === "object") return true; // header, alignment
      if (typeof type === "string") {
        return type === "paragraph" || type === "div" || type === "blockquote";
      }
      return false;
    }
    case "list":
    case "definition-list":
    case "table":
    case "horizontal-rule":
    case "clear-float":
    case "code":
    case "collapsible":
    case "tab-view":
    case "footnote-block":
    case "style":
    case "embed":
    case "embed-block":
    case "iframe":
    case "content-separator":
    case "math":
    case "bibliography-block":
      return true;
    default:
      return false;
  }
}

/**
 * Check whether an AST element is inline text content (for div_ detection).
 *
 * Returns true for elements that would normally be inside a `<p>` tag.
 * Their direct presence as a div child indicates paragraph stripping (div_).
 *
 * Non-text inline elements like `image` return false because they can
 * appear without `<p>` wrapping in `[[div]]` too.
 */
function isInlineTextElement(el: Element): boolean {
  switch (el.element) {
    case "text":
    case "line-break":
    case "line-breaks":
    case "raw":
    case "variable":
    case "email":
    case "link":
    case "anchor":
    case "anchor-name":
    case "footnote":
    case "footnote-ref":
    case "bibliography-cite":
    case "user":
    case "date":
    case "color":
    case "math-inline":
    case "equation-reference":
    case "expr":
      return true;
    case "container": {
      const type = (el.data as ContainerData)?.type;
      if (typeof type === "string") {
        switch (type) {
          case "bold":
          case "italics":
          case "underline":
          case "strikethrough":
          case "superscript":
          case "subscript":
          case "monospace":
          case "span":
          case "size":
            return true;
        }
      }
      return false;
    }
    default:
      return false;
  }
}

/**
 * Serialize a blockquote container.
 *
 * Each line of the inner content is prefixed with `> `. Nested blockquotes
 * concatenate `>` characters (e.g. `>>` for depth 2). Blank lines within
 * the blockquote use `> ` to preserve paragraph breaks.
 */
function serializeBlockquote(ctx: SerializeContext, elements: Element[]): void {
  const innerCtx = new SerializeContext({ newline: ctx.newline });
  innerCtx.insideBlockquote = true;
  serializeElements(innerCtx, elements);
  const inner = innerCtx.getBlockInnerOutput();
  const lines = inner.split(ctx.newline);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (i === lines.length - 1 && line === "") break;
    // Nested blockquote: concatenate > characters (> > → >>)
    if (line.startsWith(">")) {
      ctx.pushBlockLine(`>${line}`);
    } else if (line === "") {
      // Empty line → `> ` to preserve paragraph break
      ctx.pushBlockLine("> ");
    } else {
      ctx.pushBlockLine(`> ${line}`);
    }
  }
  // Suppress blank line after blockquote when inside another blockquote
  // (paragraph→paragraph uses requestParagraphBlankLine; paragraph→block needs none)
  if (!ctx.insideBlockquote) {
    ctx.requestBlankLine();
  }
}

/** Serialize a size container to `[[size value]]content[[/size]]` syntax. */
function serializeSizeContainer(
  ctx: SerializeContext,
  elements: Element[],
  attributes: Record<string, string>,
): void {
  const style = attributes.style ?? "";
  const match = style.match(/font-size:\s*([^;]+)/);
  const size = match ? match[1]!.trim() : "1em";
  ctx.push(`[[size ${size}]]`);
  serializeElements(ctx, elements);
  ctx.push("[[/size]]");
}

/**
 * Serialize child elements inside a block container, stripping trailing
 * blank lines from the output.
 */
function serializeBlockInner(parentCtx: SerializeContext, elements: Element[]): string {
  const innerCtx = new SerializeContext({ newline: parentCtx.newline });
  serializeElements(innerCtx, elements);
  return innerCtx.getBlockInnerOutput();
}

/** Serialize inline elements to a string (stripping trailing newline). */
function serializeInline(parentCtx: SerializeContext, elements: Element[]): string {
  const innerCtx = new SerializeContext({ newline: parentCtx.newline });
  serializeElements(innerCtx, elements);
  return innerCtx.getOutput().replace(/\n$/, "");
}

/**
 * Format an attribute map to a Wikidot attribute string.
 *
 * Attributes starting with `_` are internal and excluded. The `u-` prefix
 * on id attributes is stripped (Wikidot adds it during rendering).
 */
function formatAttributes(attributes: Record<string, string>): string {
  const entries = Object.entries(attributes).filter(([k]) => !k.startsWith("_"));
  if (entries.length === 0) return "";
  return (
    " " +
    entries
      .map(([k, v]) => {
        // Strip the u- prefix from id attributes
        if (k === "id" && v.startsWith("u-")) {
          return `${k}="${v.slice(2)}"`;
        }
        return `${k}="${v}"`;
      })
      .join(" ")
  );
}
