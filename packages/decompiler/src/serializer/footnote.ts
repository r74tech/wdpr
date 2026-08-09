import type { FootnoteBlockData, Element } from "@wdprlib/ast";
import { SerializeContext } from "./context";
import { formatDirectiveAttributes } from "./directive-safety";
import { serializeElement, serializeElements } from "./serialize-element";

/**
 * Serialize a void footnote element (inline restoration).
 *
 * Uses `footnoteCounter` to identify which footnote content to insert,
 * pulling from `tree.footnotes`.
 *
 * @param ctx - Serialization context
 * @param index - Zero-based footnote counter index
 * @param footnotes - Footnote content arrays from the syntax tree
 */
export function serializeFootnoteInline(
  ctx: SerializeContext,
  index: number,
  footnotes?: Element[][],
): void {
  const content = footnotes?.[index];
  if (content && content.length > 0) {
    serializeFootnoteContent(ctx, content);
  } else {
    ctx.push("[[footnote]][[/footnote]]");
  }
}

/**
 * Serialize a footnote-ref element (numbered reference) inline.
 *
 * @param ctx - Serialization context
 * @param refNum - 1-based footnote reference number
 * @param footnotes - Footnote content arrays from the syntax tree
 */
export function serializeFootnoteRef(
  ctx: SerializeContext,
  refNum: number,
  footnotes?: Element[][],
): void {
  const content = footnotes?.[refNum - 1];
  if (content && content.length > 0) {
    serializeFootnoteContent(ctx, content);
  } else {
    ctx.push("[[footnote]][[/footnote]]");
  }
}

/**
 * Serialize footnote content to `[[footnote]]...[[/footnote]]` syntax.
 *
 * The parser stores the first paragraph as bare elements and subsequent
 * paragraphs as paragraph containers. When paragraph containers are present,
 * a blank line (paragraph separator) is inserted between the bare elements
 * and the first paragraph container.
 */
function serializeFootnoteContent(ctx: SerializeContext, content: Element[]): void {
  // Check whether the content contains paragraph containers
  const hasParagraph = content.some(
    (el) => el.element === "container" && el.data?.type === "paragraph",
  );

  if (hasParagraph) {
    // Separate bare elements (first paragraph) from paragraph containers
    const innerCtx = new SerializeContext({ newline: ctx.newline });
    let seenParagraph = false;
    for (const el of content) {
      if (el.element === "container" && el.data?.type === "paragraph" && !seenParagraph) {
        // First paragraph container after bare elements → insert blank line separator
        seenParagraph = true;
        innerCtx.push(innerCtx.newline);
        innerCtx.pushBlankLine();
      }
      serializeElement(innerCtx, el);
    }
    const inner = innerCtx.getBlockInnerOutput();

    ctx.push("[[footnote]]" + ctx.newline);
    ctx.push(inner);
    if (!inner.endsWith(ctx.newline)) {
      ctx.push(ctx.newline);
    }
    ctx.push("[[/footnote]]");
  } else {
    // No paragraph containers → buffer and decide single-line vs multi-line
    const innerCtx = new SerializeContext({ newline: ctx.newline });
    serializeElements(innerCtx, content);
    const inner = innerCtx.getBlockInnerOutput();

    if (inner.includes(ctx.newline)) {
      ctx.push("[[footnote]]" + ctx.newline);
      ctx.push(inner);
      if (!inner.endsWith(ctx.newline)) {
        ctx.push(ctx.newline);
      }
      ctx.push("[[/footnote]]");
    } else {
      ctx.push(`[[footnote]]${inner}[[/footnote]]`);
    }
  }
}

/**
 * Serialize a footnote-block element to `[[footnoteblock]]` syntax.
 *
 * The parser implicitly appends a default footnote-block at the end of the
 * document. If this block is the last element and has no custom attributes,
 * it is skipped (the parser will re-add it on re-parse).
 *
 * @param ctx - Serialization context
 * @param data - Footnote block data
 * @param isLastElement - Whether this is the last element in the tree
 */
export function serializeFootnoteBlock(
  ctx: SerializeContext,
  data: FootnoteBlockData,
  isLastElement?: boolean,
): void {
  // Skip the implicit default footnote-block:
  // last element AND default attributes → treated as implicit
  // (explicit default footnoteblocks like footnote/block-empty are
  // indistinguishable from implicit ones — lossy)
  if (!data.title && !data.hide && isLastElement) return;

  const attributes: Record<string, string> = {};
  if (data.hide) attributes.hide = "true";
  if (data.title) attributes.title = data.title;
  const attrStr = formatDirectiveAttributes(attributes);
  // Insert a blank line before non-default footnoteblocks
  if (data.hide || data.title) {
    ctx.flushPendingBlankLine();
  }
  ctx.pushBlockLine(`[[footnoteblock${attrStr}]]`);
  ctx.requestBlankLine();
}
