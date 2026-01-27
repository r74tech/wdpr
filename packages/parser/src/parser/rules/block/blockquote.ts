import type { Element } from "@wdpr/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseInlineUntil } from "../inline/utils";
import { processDepths, type DepthList } from "../../depth";

const MAX_BLOCKQUOTE_DEPTH = 30;

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
      // Skip empty lines (paragraph breaks) within blockquote
      // This allows blockquotes to continue after blank lines
      while (ctx.tokens[pos]?.type === "NEWLINE" && ctx.tokens[pos]?.lineStart) {
        // Check if the next meaningful token is a blockquote marker
        const nextPos = pos + 1;
        const nextToken = ctx.tokens[nextPos];
        if (nextToken?.type === "BLOCKQUOTE_MARKER" && nextToken.lineStart) {
          // Empty line followed by blockquote - add line break to content and continue
          // hasLineBreak: false because this is just marking an empty line,
          // the next blockquote line will have its own line break
          depths.push({
            depth: 0,
            ltype: null,
            value: { elements: [], hasLineBreak: false },
          });
          pos++;
          consumed++;
        } else {
          break;
        }
      }

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

    // No rows parsed - rule fails
    if (depths.length === 0) {
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
 * Build a Blockquote element from a depth list
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
