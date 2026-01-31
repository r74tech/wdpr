/**
 * Line break rules
 *
 * Handles:
 * - NEWLINE token → line-break (unless before block-start token)
 * - " _\n" pattern → line-break
 * - "^_\n" pattern → line-break (underscore at start of line)
 *
 * Note: Backslash line break (\ at end of line) is handled by preproc,
 * which removes \\\n and joins lines.
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import type { TokenType } from "../../../lexer";

/**
 * Tokens that start a new block - when NEWLINE is followed by these,
 * skip the line-break to avoid extra <br> before block elements.
 *
 */
const BLOCK_START_TOKENS: TokenType[] = [
  "BLOCKQUOTE_MARKER", // >
  "LIST_BULLET", // *
  "LIST_NUMBER", // #
  "HEADING_MARKER", // + ++ +++
  "HR_MARKER", // ----
  "TABLE_MARKER", // ||
];

/**
 * Check if token is a block start token
 */
function isBlockStartToken(type: TokenType): boolean {
  return BLOCK_START_TOKENS.includes(type);
}

/**
 * Newline line break: single NEWLINE → line-break
 *
 * Skips if:
 * - Next line starts a block element (list, heading, etc.)
 * - Next token is another NEWLINE (paragraph break)
 * - End of input
 */
export const newlineLineBreakRule: InlineRule = {
  name: "newlineLineBreak",
  startTokens: ["NEWLINE"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const currentTok = ctx.tokens[ctx.pos];
    if (!currentTok || currentTok.type !== "NEWLINE") {
      return { success: false };
    }

    // Check what comes after the newline
    let lookAhead = 1;

    // Skip optional whitespace
    while (ctx.tokens[ctx.pos + lookAhead]?.type === "WHITESPACE") {
      lookAhead++;
    }

    const nextMeaningfulToken = ctx.tokens[ctx.pos + lookAhead];

    // Check if HEADING_MARKER would actually form a valid heading
    let isValidBlock = isBlockStartToken(nextMeaningfulToken?.type as TokenType);
    if (isValidBlock && nextMeaningfulToken?.type === "HEADING_MARKER") {
      const markerLen = nextMeaningfulToken.value.length;
      const afterPos = ctx.pos + lookAhead + 1;
      const afterMarker = ctx.tokens[afterPos];
      if (markerLen > 6) {
        isValidBlock = false;
      } else if (afterMarker?.type === "STAR") {
        if (ctx.tokens[afterPos + 1]?.type !== "WHITESPACE") isValidBlock = false;
      } else if (afterMarker?.type !== "WHITESPACE") {
        isValidBlock = false;
      }
    }

    // Skip line-break if:
    // - End of input
    // - Another NEWLINE (paragraph break will handle this)
    // - Valid block start token
    if (
      !nextMeaningfulToken ||
      nextMeaningfulToken.type === "EOF" ||
      nextMeaningfulToken.type === "NEWLINE" ||
      isValidBlock
    ) {
      // Don't generate line-break, return empty array
      return {
        success: true,
        elements: [],
        consumed: 1,
      };
    }

    return {
      success: true,
      elements: [{ element: "line-break" }],
      consumed: 1,
    };
  },
};

/**
 * Underscore line break: _ at end of line
 * Syntax: " _\n" (space + underscore + newline)
 * or: "^_\n" (underscore at start of line + newline)
 */
export const underscoreLineBreakRule: InlineRule = {
  name: "underscoreLineBreak",
  startTokens: ["WHITESPACE", "UNDERSCORE"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const currentTok = ctx.tokens[ctx.pos];
    if (!currentTok) {
      return { success: false };
    }

    // Pattern 1: WHITESPACE followed by UNDERSCORE, then NEWLINE
    if (currentTok.type === "WHITESPACE") {
      const nextTok = ctx.tokens[ctx.pos + 1];
      const afterTok = ctx.tokens[ctx.pos + 2];

      if (
        nextTok?.type === "UNDERSCORE" &&
        afterTok &&
        (afterTok.type === "NEWLINE" || afterTok.type === "EOF")
      ) {
        return {
          success: true,
          elements: [{ element: "line-break" }],
          consumed: 3, // WHITESPACE + UNDERSCORE + NEWLINE
        };
      }
    }

    // Pattern 2: UNDERSCORE at start of line, then NEWLINE
    if (currentTok.type === "UNDERSCORE" && currentTok.lineStart) {
      const nextTok = ctx.tokens[ctx.pos + 1];
      if (nextTok && (nextTok.type === "NEWLINE" || nextTok.type === "EOF")) {
        return {
          success: true,
          elements: [{ element: "line-break" }],
          consumed: 2, // UNDERSCORE + NEWLINE
        };
      }
    }

    return { success: false };
  },
};
