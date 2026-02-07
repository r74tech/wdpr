/**
 * @module line-break
 *
 * Parses the various Wikidot line-break syntaxes.
 *
 * Wikidot supports three distinct mechanisms for producing `<br />` elements:
 *
 * 1. Implicit newline: a single `NEWLINE` token within a paragraph
 *    becomes a `<br />`, unless it precedes a block-level element
 *    (heading, list, blockquote, etc.) or another newline (paragraph break).
 *
 * 2. Backslash at end of line: `\` followed by newline. The preprocessor
 *    converts `\\\n` to a `BACKSLASH_BREAK` token (U+E000), which this
 *    rule then handles. Wikidot preserves a space after the line break
 *    in this case.
 *
 * 3. Underscore at end of line: ` _` followed by newline, or `_` at the
 *    start of a line followed by newline. This is a more explicit
 *    line-break syntax.
 *
 * All three rules mark their line-break elements with `_preservedTrailingBreak`
 * when the break was explicitly requested (backslash or underscore syntax),
 * so the paragraph postprocessor knows not to strip trailing breaks.
 *
 * The newline rule suppresses line-breaks in several situations to avoid
 * spurious `<br />` elements before block-level constructs.
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import type { TokenType } from "../../../lexer";

/**
 * Token types that indicate the start of a block-level element.
 *
 * When a NEWLINE is followed (after optional whitespace) by one of
 * these token types, the newline line-break rule suppresses the
 * `<br />` to prevent extra whitespace before block elements.
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
 * Checks whether a token type represents the start of a block-level element.
 *
 * @param type - The token type to check
 * @returns `true` if the token type is in the {@link BLOCK_START_TOKENS} list
 */
function isBlockStartToken(type: TokenType): boolean {
  return BLOCK_START_TOKENS.includes(type);
}

/**
 * Inline rule for implicit newline-to-line-break conversion.
 *
 * A single `NEWLINE` token within inline content typically becomes a
 * `<br />` element. However, the line break is suppressed in several
 * situations to match Wikidot's behavior:
 *
 * - End of input (no meaningful token follows)
 * - Another NEWLINE follows (this is a paragraph break, not a line break)
 * - A valid block-start token follows at line start (heading, list, etc.)
 * - A `BACKSLASH_BREAK` token follows (the backslash rule handles the break)
 *
 * Additional validation is performed for heading and list markers to ensure
 * they actually form valid block structures (e.g. a heading marker of 7+
 * characters is not a valid heading).
 */
export const newlineLineBreakRule: InlineRule = {
  name: "newlineLineBreak",
  startTokens: ["NEWLINE"],

  /**
   * Attempts to convert a NEWLINE token into a line-break element.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with either a `"line-break"` element or
   *          an empty array (when the break is suppressed)
   */
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
    // Also check lineStart for list markers - they're only valid at true line start
    let isValidBlock = isBlockStartToken(nextMeaningfulToken?.type as TokenType);
    if (
      isValidBlock &&
      (nextMeaningfulToken?.type === "LIST_BULLET" || nextMeaningfulToken?.type === "LIST_NUMBER")
    ) {
      // List markers are only valid block starts when at actual line start
      if (!nextMeaningfulToken.lineStart) {
        isValidBlock = false;
      }
    }
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

    // Check if there's a BACKSLASH_BREAK ahead (skip whitespace)
    // Pattern: NEWLINE + WHITESPACE? + BACKSLASH_BREAK
    // In this case, the BACKSLASH_BREAK rule will handle the line-break
    let hasBackslashBreak = false;
    {
      let ahead = 1;
      while (ctx.tokens[ctx.pos + ahead]?.type === "WHITESPACE") {
        ahead++;
      }
      if (ctx.tokens[ctx.pos + ahead]?.type === "BACKSLASH_BREAK") {
        hasBackslashBreak = true;
      }
    }

    // Skip line-break if:
    // - End of input
    // - Another NEWLINE (paragraph break will handle this)
    // - Valid block start token
    // - BACKSLASH_BREAK ahead (that rule will create the line-break)
    if (
      !nextMeaningfulToken ||
      nextMeaningfulToken.type === "EOF" ||
      nextMeaningfulToken.type === "NEWLINE" ||
      isValidBlock ||
      hasBackslashBreak
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
 * Inline rule for backslash-at-end-of-line line breaks.
 *
 * In Wikidot, a backslash at the end of a line (`\` followed by newline)
 * creates a line break. The preprocessor converts this `\\\n` sequence
 * into a special `BACKSLASH_BREAK` token (U+E000).
 *
 * This rule handles two token patterns:
 * - `WHITESPACE + BACKSLASH_BREAK`: produces a line-break followed by a
 *   space text element (Wikidot preserves the space after the break)
 * - Standalone `BACKSLASH_BREAK`: produces only a line-break
 *
 * A special case exists when the backslash break is followed by an
 * underscore line-break pattern (` _\n`): in that case, the trailing
 * space is omitted to avoid doubled spacing.
 *
 * All line-break elements produced by this rule are marked with
 * `_preservedTrailingBreak = true` so the paragraph postprocessor
 * does not strip them.
 */
export const backslashLineBreakRule: InlineRule = {
  name: "backslashLineBreak",
  startTokens: ["WHITESPACE", "BACKSLASH_BREAK"],

  /**
   * Attempts to parse a backslash line break at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with line-break elements (and possibly a
   *          trailing space), or `{ success: false }` if the pattern does not match
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const currentTok = ctx.tokens[ctx.pos];
    if (!currentTok) {
      return { success: false };
    }

    // Pattern: WHITESPACE + BACKSLASH_BREAK → line-break + text(" ")
    // But if followed by underscore line-break pattern, don't include the space
    if (currentTok.type === "WHITESPACE") {
      const nextTok = ctx.tokens[ctx.pos + 1];
      if (nextTok?.type === "BACKSLASH_BREAK") {
        // Check if followed by " _\n" pattern (underscore line-break)
        const afterBreak = ctx.tokens[ctx.pos + 2];
        const afterAfter = ctx.tokens[ctx.pos + 3];
        const afterAfterAfter = ctx.tokens[ctx.pos + 4];

        const isFollowedByUnderscoreBreak =
          afterBreak?.type === "WHITESPACE" &&
          afterAfter?.type === "UNDERSCORE" &&
          (afterAfterAfter?.type === "NEWLINE" || afterAfterAfter?.type === "EOF");

        if (isFollowedByUnderscoreBreak) {
          // Don't include the space, let underscore rule handle the rest
          // Mark as explicit line-break to preserve at paragraph end
          const lb: any = { element: "line-break" };
          lb._preservedTrailingBreak = true;
          return {
            success: true,
            elements: [lb],
            consumed: 2,
          };
        }

        // Mark as explicit line-break to preserve at paragraph end
        const lb: any = { element: "line-break" };
        lb._preservedTrailingBreak = true;
        return {
          success: true,
          elements: [lb, { element: "text", data: " " }],
          consumed: 2,
        };
      }
      return { success: false };
    }

    // Standalone BACKSLASH_BREAK
    // Mark as explicit line-break to preserve at paragraph end
    if (currentTok.type === "BACKSLASH_BREAK") {
      const lb: any = { element: "line-break" };
      lb._preservedTrailingBreak = true;
      return {
        success: true,
        elements: [lb],
        consumed: 1,
      };
    }

    return { success: false };
  },
};

/**
 * Inline rule for underscore-at-end-of-line line breaks.
 *
 * Wikidot syntax: ` _` followed by newline (space + underscore + newline),
 * or `_` at the start of a line followed by newline.
 *
 * This rule handles two token patterns:
 * - Pattern 1: `WHITESPACE + UNDERSCORE + NEWLINE/EOF`
 * - Pattern 2: `UNDERSCORE (at lineStart) + NEWLINE/EOF`
 *
 * Both patterns consume the newline as part of the line-break to prevent
 * the newline rule from producing a duplicate break.
 *
 * All line-break elements are marked with `_preservedTrailingBreak = true`
 * so the paragraph postprocessor does not strip them.
 */
export const underscoreLineBreakRule: InlineRule = {
  name: "underscoreLineBreak",
  startTokens: ["WHITESPACE", "UNDERSCORE"],

  /**
   * Attempts to parse an underscore line break at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with a `"line-break"` element,
   *          or `{ success: false }` if the pattern does not match
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const currentTok = ctx.tokens[ctx.pos];
    if (!currentTok) {
      return { success: false };
    }

    // Pattern 1: WHITESPACE followed by UNDERSCORE, then NEWLINE
    // Mark as explicit line-break to preserve at paragraph end
    if (currentTok.type === "WHITESPACE") {
      const nextTok = ctx.tokens[ctx.pos + 1];
      const afterTok = ctx.tokens[ctx.pos + 2];

      if (
        nextTok?.type === "UNDERSCORE" &&
        afterTok &&
        (afterTok.type === "NEWLINE" || afterTok.type === "EOF")
      ) {
        const lb: any = { element: "line-break" };
        lb._preservedTrailingBreak = true;
        return {
          success: true,
          elements: [lb],
          consumed: 3, // WHITESPACE + UNDERSCORE + NEWLINE
        };
      }
    }

    // Pattern 2: UNDERSCORE at start of line, then NEWLINE
    // Mark as explicit line-break to preserve at paragraph end
    if (currentTok.type === "UNDERSCORE" && currentTok.lineStart) {
      const nextTok = ctx.tokens[ctx.pos + 1];
      if (nextTok && (nextTok.type === "NEWLINE" || nextTok.type === "EOF")) {
        const lb: any = { element: "line-break" };
        lb._preservedTrailingBreak = true;
        return {
          success: true,
          elements: [lb],
          consumed: 2, // UNDERSCORE + NEWLINE
        };
      }
    }

    return { success: false };
  },
};
