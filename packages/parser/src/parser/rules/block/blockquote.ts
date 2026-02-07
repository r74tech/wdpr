/**
 *
 * Block rule for Wikidot-style blockquotes using `>` markers.
 *
 * Wikidot blockquotes are written with one or more `>` characters at the
 * start of a line, followed by a mandatory space and then the content:
 *
 * ```
 * > First level
 * >> Second level
 * > Back to first
 * ```
 *
 * Key behaviours:
 * - The depth is determined by the number of consecutive `>` characters.
 * - A space after the `>` markers is required; lines like `>No space` are
 *   consumed but silently discarded from output.
 * - An empty line (just `> `) within the same depth acts as a paragraph
 *   separator inside the blockquote.
 * - Nesting is handled by the generic {@link processDepths} utility, which
 *   converts flat depth-annotated rows into a recursive tree structure.
 * - Maximum depth is capped at {@link MAX_BLOCKQUOTE_DEPTH} (30) to guard
 *   against pathological input.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseInlineUntil } from "../inline/utils";
import { processDepths, type DepthList } from "../../depth";

/**
 * Safety limit for blockquote nesting depth.
 * Lines exceeding this depth are not parsed, preventing stack issues
 * on deeply nested or malicious input.
 */
const MAX_BLOCKQUOTE_DEPTH = 30;

/**
 * Block rule for `>` prefix blockquotes.
 *
 * Parsing strategy:
 * 1. Collect consecutive lines that begin with BLOCKQUOTE_MARKER at line start.
 * 2. For each line, record the depth (number of `>` chars, zero-indexed)
 *    and parse the inline content after the mandatory space.
 * 3. Lines missing the required space are consumed but produce no output.
 * 4. Feed the flat depth list into {@link processDepths} to build a nested tree.
 * 5. Recursively convert the tree into nested blockquote container elements
 *    via {@link buildBlockquoteElement}.
 */
export const blockquoteRule: BlockRule = {
  name: "blockquote",
  startTokens: ["BLOCKQUOTE_MARKER"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    const firstToken = currentToken(ctx);

    if (!firstToken.lineStart) {
      return { success: false };
    }

    // Collect depth-annotated lines
    const depths: Array<{
      depth: number;
      ltype: null;
      value: { elements: Element[]; hasLineBreak: boolean };
    }> = [];
    let pos = ctx.pos;
    let consumed = 0;

    while (pos < ctx.tokens.length) {
      const markerToken = ctx.tokens[pos];
      if (!markerToken || !markerToken.lineStart || markerToken.type !== "BLOCKQUOTE_MARKER") {
        break;
      }

      // Depth is determined by the number of > characters
      // Token value is like ">", ">>", ">>>", etc.
      const depth = markerToken.value.length;

      // Check maximum depth to prevent DOS
      if (depth > MAX_BLOCKQUOTE_DEPTH) {
        break;
      }

      // Skip marker
      pos++;
      consumed++;

      // Wikidot requires a space after > markers
      // Lines without space (e.g. ">No") are consumed but not output
      if (ctx.tokens[pos]?.type !== "WHITESPACE") {
        // Consume rest of line silently
        while (pos < ctx.tokens.length && ctx.tokens[pos]?.type !== "NEWLINE") {
          pos++;
          consumed++;
        }
        if (ctx.tokens[pos]?.type === "NEWLINE") {
          pos++;
          consumed++;
        }
        continue;
      }

      // Skip whitespace after marker
      while (ctx.tokens[pos]?.type === "WHITESPACE") {
        pos++;
        consumed++;
      }

      // Parse inline content until newline or paragraph break
      const inlineCtx: ParseContext = { ...ctx, pos };
      const inlineResult = parseInlineUntil(inlineCtx, "NEWLINE");
      const inlineChildren: Element[] = inlineResult.elements;
      consumed += inlineResult.consumed;
      pos += inlineResult.consumed;

      // Check if there's a line break
      let hasLineBreak = false;
      if (ctx.tokens[pos]?.type === "NEWLINE") {
        hasLineBreak = true;
        pos++;
        consumed++;
      }

      // Append depth item (depth is 0-indexed, so subtract 1)
      depths.push({
        depth: depth - 1,
        ltype: null,
        value: { elements: inlineChildren, hasLineBreak },
      });
    }

    // No rows parsed
    if (depths.length === 0) {
      // If we consumed tokens (e.g. lines without space after >), return empty success
      if (consumed > 0) {
        return { success: true, elements: [], consumed };
      }
      return { success: false };
    }

    // Process depths to build nested structure
    const depthTrees = processDepths<null, { elements: Element[]; hasLineBreak: boolean }>(
      null,
      depths,
    );

    // Convert depth trees to blockquote elements
    const blockquotes = depthTrees.map(({ list }) => buildBlockquoteElement(list));

    // Return first blockquote (should usually be only one)
    if (blockquotes.length === 0) {
      return { success: false };
    }

    return {
      success: true,
      elements: blockquotes,
      consumed,
    };
  },
};

/**
 * Recursively converts a depth-tree (produced by {@link processDepths}) into
 * a blockquote container element.
 *
 * Leaf items are accumulated into paragraph containers. An empty-content
 * item acts as a paragraph separator. When a nested sub-list is encountered,
 * the current paragraph is flushed and a child blockquote is created.
 *
 * @param list - The depth list to convert.
 * @returns A container element with `type: "blockquote"`.
 */
function buildBlockquoteElement(
  list: DepthList<null, { elements: Element[]; hasLineBreak: boolean }>,
): Element {
  const children: Element[] = [];
  let currentParagraphChildren: Element[] = [];

  function flushParagraph() {
    if (currentParagraphChildren.length > 0) {
      // Remove trailing line break from paragraph
      while (
        currentParagraphChildren.length > 0 &&
        currentParagraphChildren[currentParagraphChildren.length - 1]?.element === "line-break"
      ) {
        currentParagraphChildren.pop();
      }
      if (currentParagraphChildren.length > 0) {
        children.push({
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: currentParagraphChildren,
          },
        });
      }
      currentParagraphChildren = [];
    }
  }

  for (const item of list) {
    if (item.kind === "item") {
      // Empty content line (e.g. "> ") acts as paragraph separator
      if (item.value.elements.length === 0) {
        flushParagraph();
        continue;
      }
      // Add elements to current paragraph
      currentParagraphChildren.push(...item.value.elements);
      // Add line break after this line
      if (item.value.hasLineBreak) {
        currentParagraphChildren.push({ element: "line-break" });
      }
    } else {
      // Nested blockquote - flush current paragraph and add nested blockquote
      flushParagraph();
      children.push(buildBlockquoteElement(item.children));
    }
  }

  // Flush remaining paragraph content
  flushParagraph();

  return {
    element: "container",
    data: {
      type: "blockquote",
      attributes: {},
      elements: children,
    },
  };
}
