/**
 * @module text
 *
 * Provides the two lowest-priority inline rules: `textRule` and `fallbackRule`.
 *
 * These rules act as catch-alls that convert unrecognized tokens into
 * plain `"text"` AST elements, ensuring no token is ever silently dropped
 * during inline parsing.
 *
 * `textRule` handles `TEXT` and `WHITESPACE` tokens specifically and is
 * included in the main {@link inlineRules} array as the last entry before
 * the fallback.
 *
 * `fallbackRule` has an empty `startTokens` array, which means it matches
 * ANY token type. It is exported separately as `inlineFallbackRule` and
 * is NOT included in the `inlineRules` array to prevent it from
 * short-circuiting more specific rules. Instead, it is invoked explicitly
 * by the parser when no other rule matches.
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

/**
 * Inline rule for plain text and whitespace tokens.
 *
 * Matches `TEXT` and `WHITESPACE` token types and converts them
 * directly to `"text"` AST elements. This rule always succeeds.
 *
 * Placed last (before the fallback) in the inline rules array so
 * that all formatting and structural rules are tried first.
 */
export const textRule: InlineRule = {
  name: "text",
  startTokens: ["TEXT", "WHITESPACE"],

  /**
   * Converts a TEXT or WHITESPACE token into a text element.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns Always returns `{ success: true }` with a single `"text"` element
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const token = currentToken(ctx);

    return {
      success: true,
      elements: [{ element: "text", data: token.value }],
      consumed: 1,
    };
  },
};

/**
 * Universal fallback rule for any token type not matched by other rules.
 *
 * The empty `startTokens` array signals to the parser that this rule
 * can match any token. It converts the token's value to a `"text"`
 * element, ensuring no token is silently dropped.
 *
 * This rule is used as a last-resort handler and is intentionally
 * excluded from the main `inlineRules` array.
 */
export const fallbackRule: InlineRule = {
  name: "fallback",
  startTokens: [], // matches anything not matched by other rules

  /**
   * Converts any unrecognized token into a text element.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns Always returns `{ success: true }` with a single `"text"` element
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const token = currentToken(ctx);

    return {
      success: true,
      elements: [{ element: "text", data: token.value }],
      consumed: 1,
    };
  },
};
