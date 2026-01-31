/**
 * Expression rules: [[#expr]], [[#if]], [[#ifexpr]]
 *
 * [[#expr expression]]
 *   - Evaluates expression and displays the result
 *
 * [[#if value | then | else]]
 *   - Simple true/false checker, treats value as string
 *   - False values: "false", "null", "", "0"
 *
 * [[#ifexpr expression | then | else]]
 *   - Evaluates expression and branches based on result
 *
 * Expression limit: 256 characters (after trim)
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { currentToken } from "../types";

const MAX_EXPRESSION_LENGTH = 256;

/**
 * Parse inline content for then/else branches, stopping at PIPE or BLOCK_CLOSE.
 * Tracks nesting depth to handle PIPE inside nested [[...]] blocks.
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
 * Collect raw text for expression/condition until PIPE or BLOCK_CLOSE.
 * Tracks nesting depth to handle PIPE inside nested [[...]] blocks.
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
 * Expression rule: [[#expr expression]]
 */
export const exprRule: InlineRule = {
  name: "expr",
  startTokens: ["BLOCK_OPEN"],

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
 * If rule: [[#if value | then | else]]
 */
export const ifRule: InlineRule = {
  name: "if",
  startTokens: ["BLOCK_OPEN"],

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
 * IfExpr rule: [[#ifexpr expression | then | else]]
 */
export const ifExprRule: InlineRule = {
  name: "ifexpr",
  startTokens: ["BLOCK_OPEN"],

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
