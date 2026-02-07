/**
 *
 * Parses Wikidot's inline expression and conditional block syntax:
 *
 * - `[[#expr expression]]` -- evaluate a mathematical expression and display the result
 * - `[[#if value | then | else]]` -- simple truthy/falsy conditional
 * - `[[#ifexpr expression | then | else]]` -- expression-based conditional
 *
 * All three forms begin with `[[#` followed by the keyword. The `#`
 * prefix distinguishes these from regular `[[block]]` syntax.
 *
 * `[[#if]]` treats its condition as a string and considers these values
 * falsy: `"false"`, `"null"`, `""`, `"0"`. Everything else is truthy.
 *
 * `[[#ifexpr]]` evaluates its condition as a mathematical expression
 * and treats the numeric result as falsy when zero.
 *
 * Both conditional forms support an optional else branch: when only
 * one pipe-separated branch is provided, the else branch is empty.
 *
 * Expressions are limited to 256 characters (after trimming) to
 * prevent abuse.
 *
 * The pipe (`|`) delimiter is depth-aware: pipes inside nested `[[]]`
 * or `[[[]]]` blocks are not treated as branch separators.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

/** Maximum allowed length for expression strings after trimming. */
const MAX_EXPRESSION_LENGTH = 256;

/**
 * Parses inline content for the then/else branches of `[[#if]]` and `[[#ifexpr]]`.
 *
 * Collects inline elements (by delegating to the registered inline rules) until
 * a top-level `PIPE` token or the enclosing `BLOCK_CLOSE` (`]]`) is reached.
 *
 * Nesting depth is tracked so that `PIPE` and `BLOCK_CLOSE` tokens inside
 * nested `[[...]]` or `[[[...]]]` blocks are not mistaken for branch
 * delimiters or the outer block's closing marker.
 *
 * @param ctx - The current parse context
 * @param startPos - Token index at which to begin scanning branch content
 * @returns An object containing the parsed elements, the number of tokens consumed,
 *          and whether the branch ended with a `PIPE` (indicating an else branch follows)
 */
function parseInlineBranch(
  ctx: ParseContext,
  startPos: number,
): { elements: Element[]; consumed: number; endedWithPipe: boolean } {
  const elements: Element[] = [];
  let consumed = 0;
  let pos = startPos;
  let depth = 0; // Track [[ ]] nesting depth

  const { inlineRules } = ctx;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF" || token.type === "NEWLINE") {
      break;
    }

    // Track nesting (both [[...]] and [[[...]]] blocks)
    if (
      token.type === "BLOCK_OPEN" ||
      token.type === "BLOCK_END_OPEN" ||
      token.type === "LINK_OPEN"
    ) {
      depth++;
    } else if (token.type === "BLOCK_CLOSE" || token.type === "LINK_CLOSE") {
      if (depth === 0) {
        // End of the outer block
        break;
      }
      depth--;
    }

    // Stop at PIPE only at top level
    if (token.type === "PIPE" && depth === 0) {
      return { elements, consumed, endedWithPipe: true };
    }

    // Try inline rules
    const inlineCtx: ParseContext = { ...ctx, pos };
    let matched = false;

    for (const rule of inlineRules) {
      // Skip rules that would consume our delimiters
      if (rule.startTokens.includes("PIPE") || rule.startTokens.includes("BLOCK_CLOSE")) {
        continue;
      }
      if (rule.startTokens.length === 0 || rule.startTokens.includes(token.type)) {
        const result = rule.parse(inlineCtx);
        if (result.success) {
          elements.push(...result.elements);
          consumed += result.consumed;
          pos += result.consumed;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      // Fallback to text
      elements.push({ element: "text", data: token.value });
      consumed++;
      pos++;
    }
  }

  return { elements, consumed, endedWithPipe: false };
}

/**
 * Collects raw text for the expression or condition portion of `[[#expr]]`,
 * `[[#if]]`, and `[[#ifexpr]]` blocks.
 *
 * Unlike {@link parseInlineBranch}, this function collects raw token values
 * as a concatenated string rather than parsing them as inline elements.
 * This is appropriate for expressions and conditions that are evaluated
 * at runtime rather than rendered as markup.
 *
 * Tracks nesting depth to correctly handle `PIPE` tokens that appear
 * inside nested `[[...]]` or `[[[...]]]` blocks.
 *
 * @param ctx - The current parse context
 * @param startPos - Token index at which to begin collecting text
 * @returns An object containing the trimmed expression text, the number of tokens
 *          consumed, and whether collection ended at a `PIPE` (vs. `BLOCK_CLOSE`)
 */
function collectExpressionText(
  ctx: ParseContext,
  startPos: number,
): { text: string; consumed: number; endedWithPipe: boolean } {
  let text = "";
  let consumed = 0;
  let pos = startPos;
  let depth = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF" || token.type === "NEWLINE") {
      break;
    }

    // Track nesting (both [[...]] and [[[...]]] blocks)
    if (
      token.type === "BLOCK_OPEN" ||
      token.type === "BLOCK_END_OPEN" ||
      token.type === "LINK_OPEN"
    ) {
      depth++;
    } else if (token.type === "BLOCK_CLOSE" || token.type === "LINK_CLOSE") {
      if (depth === 0) {
        break;
      }
      depth--;
    }

    // Stop at PIPE only at top level
    if (token.type === "PIPE" && depth === 0) {
      return { text: text.trim(), consumed, endedWithPipe: true };
    }

    text += token.value;
    consumed++;
    pos++;
  }

  return { text: text.trim(), consumed, endedWithPipe: false };
}

/**
 * Inline rule for parsing `[[#expr expression]]`.
 *
 * Evaluates the given mathematical expression at runtime and displays
 * the result inline. The expression is case-sensitive and must use
 * lowercase `expr`.
 *
 * Produces an `"expr"` AST element whose `data.expression` field
 * contains the raw expression string for later evaluation.
 */
export const exprRule: InlineRule = {
  name: "expr",
  startTokens: ["BLOCK_OPEN"],

  /**
   * Attempts to parse a `[[#expr expression]]` block at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with an `"expr"` element, or `{ success: false }`
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Expect # immediately after [[
    const hashToken = ctx.tokens[pos];
    if (!hashToken || hashToken.type !== "HASH") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Expect identifier "expr" (case-sensitive - Wikidot only supports lowercase)
    const idToken = ctx.tokens[pos];
    if (!idToken || idToken.type !== "IDENTIFIER" || idToken.value !== "expr") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Collect expression until ]]
    const exprResult = collectExpressionText(ctx, pos);
    const expression = exprResult.text;
    pos += exprResult.consumed;
    consumed += exprResult.consumed;

    // Validate expression length
    if (expression.length > MAX_EXPRESSION_LENGTH) {
      return { success: false };
    }

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    return {
      success: true,
      elements: [
        {
          element: "expr",
          data: { expression },
        },
      ],
      consumed,
    };
  },
};

/**
 * Inline rule for parsing `[[#if value | then | else]]`.
 *
 * Performs a simple truthy/falsy check on a string value. The value
 * is treated as false when it matches `"false"`, `"null"`, `""`,
 * or `"0"` (case-insensitive); all other values are truthy.
 *
 * The then branch is required (separated from the condition by `|`).
 * The else branch is optional (separated from the then branch by
 * another `|`).
 *
 * Produces an `"if"` AST element with `condition`, `then`, and
 * `else` fields.
 */
export const ifRule: InlineRule = {
  name: "if",
  startTokens: ["BLOCK_OPEN"],

  /**
   * Attempts to parse a `[[#if value | then | else]]` block at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with an `"if"` element, or `{ success: false }`
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Expect # immediately after [[
    const hashToken = ctx.tokens[pos];
    if (!hashToken || hashToken.type !== "HASH") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Expect identifier "if" (case-sensitive - Wikidot only supports lowercase)
    const idToken = ctx.tokens[pos];
    if (!idToken || idToken.type !== "IDENTIFIER" || idToken.value !== "if") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Collect condition until first |
    const condResult = collectExpressionText(ctx, pos);
    if (!condResult.endedWithPipe) {
      return { success: false }; // Must have | separator
    }
    const condition = condResult.text;
    pos += condResult.consumed;
    consumed += condResult.consumed;

    // Validate condition length
    if (condition.length > MAX_EXPRESSION_LENGTH) {
      return { success: false };
    }

    // Skip the PIPE
    if (ctx.tokens[pos]?.type !== "PIPE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Skip whitespace after |
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Parse "then" branch until next |
    const thenResult = parseInlineBranch(ctx, pos);
    pos += thenResult.consumed;
    consumed += thenResult.consumed;

    let elseElements: Element[] = [];

    if (thenResult.endedWithPipe) {
      // Skip the PIPE
      if (ctx.tokens[pos]?.type !== "PIPE") {
        return { success: false };
      }
      pos++;
      consumed++;

      // Skip whitespace after |
      while (ctx.tokens[pos]?.type === "WHITESPACE") {
        pos++;
        consumed++;
      }

      // Parse "else" branch until ]]
      const elseResult = parseInlineBranch(ctx, pos);
      elseElements = elseResult.elements;
      pos += elseResult.consumed;
      consumed += elseResult.consumed;
    }

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    return {
      success: true,
      elements: [
        {
          element: "if",
          data: {
            condition,
            then: thenResult.elements,
            else: elseElements,
          },
        },
      ],
      consumed,
    };
  },
};

/**
 * Inline rule for parsing `[[#ifexpr expression | then | else]]`.
 *
 * Evaluates a mathematical expression and uses the result to choose
 * between the then and else branches. A zero result selects the else
 * branch; any non-zero result selects the then branch.
 *
 * Like `[[#if]]`, the then branch is required and the else branch
 * is optional.
 *
 * Produces an `"ifexpr"` AST element with `expression`, `then`, and
 * `else` fields.
 */
export const ifExprRule: InlineRule = {
  name: "ifexpr",
  startTokens: ["BLOCK_OPEN"],

  /**
   * Attempts to parse a `[[#ifexpr expression | then | else]]` block at the current position.
   *
   * @param ctx - Parse context with token stream and current position
   * @returns A successful result with an `"ifexpr"` element, or `{ success: false }`
   */
  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    let pos = ctx.pos + 1;
    let consumed = 1;

    // Expect # immediately after [[
    const hashToken = ctx.tokens[pos];
    if (!hashToken || hashToken.type !== "HASH") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Expect identifier "ifexpr" (case-sensitive - Wikidot only supports lowercase)
    const idToken = ctx.tokens[pos];
    if (!idToken || idToken.type !== "IDENTIFIER" || idToken.value !== "ifexpr") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Skip whitespace
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Collect expression until first |
    const exprResult = collectExpressionText(ctx, pos);
    if (!exprResult.endedWithPipe) {
      return { success: false }; // Must have | separator
    }
    const expression = exprResult.text;
    pos += exprResult.consumed;
    consumed += exprResult.consumed;

    // Validate expression length
    if (expression.length > MAX_EXPRESSION_LENGTH) {
      return { success: false };
    }

    // Skip the PIPE
    if (ctx.tokens[pos]?.type !== "PIPE") {
      return { success: false };
    }
    pos++;
    consumed++;

    // Skip whitespace after |
    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }

    // Parse "then" branch until next |
    const thenResult = parseInlineBranch(ctx, pos);
    pos += thenResult.consumed;
    consumed += thenResult.consumed;

    let elseElements: Element[] = [];

    if (thenResult.endedWithPipe) {
      // Skip the PIPE
      if (ctx.tokens[pos]?.type !== "PIPE") {
        return { success: false };
      }
      pos++;
      consumed++;

      // Skip whitespace after |
      while (ctx.tokens[pos]?.type === "WHITESPACE") {
        pos++;
        consumed++;
      }

      // Parse "else" branch until ]]
      const elseResult = parseInlineBranch(ctx, pos);
      elseElements = elseResult.elements;
      pos += elseResult.consumed;
      consumed += elseResult.consumed;
    }

    // Expect ]]
    if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    pos++;
    consumed++;

    return {
      success: true,
      elements: [
        {
          element: "ifexpr",
          data: {
            expression,
            then: thenResult.elements,
            else: elseElements,
          },
        },
      ],
      consumed,
    };
  },
};
