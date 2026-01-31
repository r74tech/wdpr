import type { Element } from "@wdprlib/ast";
import type { BlockRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";
import { parseBlocksUntil } from "./utils";

type AlignDirection = "left" | "right" | "center" | "justify";

/**
 * Maps align syntax to direction
 * [[>]] = right, [[<]] = left, [[=]] = center, [[==]] = justify
 */
function parseAlignOpen(
  ctx: ParseContext,
  pos: number,
): { direction: AlignDirection; consumed: number } | null {
  const tokens = ctx.tokens;

  // After BLOCK_OPEN, expect specific patterns
  const firstToken = tokens[pos];
  if (!firstToken) return null;

  // [[>]] - right
  if (
    firstToken.type === "BLOCKQUOTE_MARKER" &&
    firstToken.value === ">" &&
    tokens[pos + 1]?.type === "BLOCK_CLOSE"
  ) {
    return { direction: "right", consumed: 2 };
  }

  // Also handle TEXT ">" for non-line-start cases
  if (
    firstToken.type === "TEXT" &&
    firstToken.value === ">" &&
    tokens[pos + 1]?.type === "BLOCK_CLOSE"
  ) {
    return { direction: "right", consumed: 2 };
  }

  // [[<]] - left (LEFT_DOUBLE_ANGLE might be tokenized, but usually it's after [[)
  if (
    firstToken.type === "TEXT" &&
    firstToken.value === "<" &&
    tokens[pos + 1]?.type === "BLOCK_CLOSE"
  ) {
    return { direction: "left", consumed: 2 };
  }

  // [[=]] - center (single =)
  if (firstToken.type === "EQUALS" && tokens[pos + 1]?.type === "BLOCK_CLOSE") {
    return { direction: "center", consumed: 2 };
  }

  // [[==]] - justify (double =)
  if (
    firstToken.type === "EQUALS" &&
    tokens[pos + 1]?.type === "EQUALS" &&
    tokens[pos + 2]?.type === "BLOCK_CLOSE"
  ) {
    return { direction: "justify", consumed: 3 };
  }

  return null;
}

/**
 * Check if we're at a closing align tag matching the given direction
 */
function isAlignClose(
  ctx: ParseContext,
  direction: AlignDirection,
): { match: boolean; consumed: number } {
  const tokens = ctx.tokens;
  let pos = ctx.pos;

  if (tokens[pos]?.type !== "BLOCK_END_OPEN") {
    return { match: false, consumed: 0 };
  }
  pos++;

  // [[/>]] - right
  if (direction === "right") {
    if (
      (tokens[pos]?.type === "BLOCKQUOTE_MARKER" || tokens[pos]?.type === "TEXT") &&
      tokens[pos]?.value === ">" &&
      tokens[pos + 1]?.type === "BLOCK_CLOSE"
    ) {
      return { match: true, consumed: 3 };
    }
  }

  // [[/<]] - left
  if (direction === "left") {
    if (
      tokens[pos]?.type === "TEXT" &&
      tokens[pos]?.value === "<" &&
      tokens[pos + 1]?.type === "BLOCK_CLOSE"
    ) {
      return { match: true, consumed: 3 };
    }
  }

  // [[/=]] - center
  if (direction === "center") {
    if (tokens[pos]?.type === "EQUALS" && tokens[pos + 1]?.type === "BLOCK_CLOSE") {
      return { match: true, consumed: 3 };
    }
  }

  // [[/==]] - justify
  if (direction === "justify") {
    if (
      tokens[pos]?.type === "EQUALS" &&
      tokens[pos + 1]?.type === "EQUALS" &&
      tokens[pos + 2]?.type === "BLOCK_CLOSE"
    ) {
      return { match: true, consumed: 4 };
    }
  }

  return { match: false, consumed: 0 };
}

export const alignRule: BlockRule = {
  name: "align",
  startTokens: ["BLOCK_OPEN"],
  requiresLineStart: true,

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Parse align open syntax
    const alignResult = parseAlignOpen(ctx, pos);
    if (!alignResult) {
      return { success: false };
    }

    const { direction } = alignResult;
    pos += alignResult.consumed;
    consumed += alignResult.consumed;

    // Must be followed by newline
    if (ctx.tokens[pos]?.type !== "NEWLINE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Close condition
    const closeCondition = (checkCtx: ParseContext): boolean => {
      return isAlignClose(checkCtx, direction).match;
    };

    // Parse body
    const bodyCtx: ParseContext = { ...ctx, pos };
    const bodyResult = parseBlocksUntil(bodyCtx, closeCondition);
    consumed += bodyResult.consumed;
    pos += bodyResult.consumed;

    // Consume closing tag
    const closeCheck = isAlignClose({ ...ctx, pos }, direction);
    if (closeCheck.match) {
      consumed += closeCheck.consumed;
      pos += closeCheck.consumed;

      // Consume trailing newline
      if (ctx.tokens[pos]?.type === "NEWLINE") {
        pos++;
        consumed++;
      }
    }

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: { align: direction },
            attributes: {},
            elements: bodyResult.elements,
          },
        },
      ],
      consumed,
    };
  },
};
