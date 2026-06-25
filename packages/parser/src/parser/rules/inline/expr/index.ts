/**
 * Public inline rules for Wikidot expression and conditional syntax.
 *
 * @module
 */

import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { collectExpressionText } from "./branch";
import { parseConditional } from "./conditional";
import { createExprElement, createIfElement, createIfExprElement } from "./elements";
import { MAX_EXPRESSION_LENGTH, parseExprOpener } from "./syntax";

export const exprRule: InlineRule = {
  name: "expr",
  startTokens: ["BLOCK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    if (currentToken(ctx).type !== "BLOCK_OPEN") {
      return { success: false };
    }

    const opener = parseExprOpener(ctx, "expr");
    if (!opener.success) {
      return { success: false };
    }

    let pos = opener.pos;
    let consumed = opener.consumed;

    const exprResult = collectExpressionText(ctx, pos);
    const expression = exprResult.text;
    pos += exprResult.consumed;
    consumed += exprResult.consumed;

    if (expression.length > MAX_EXPRESSION_LENGTH || ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
      return { success: false };
    }
    consumed++;

    return {
      success: true,
      elements: [createExprElement(expression)],
      consumed,
    };
  },
};

export const ifRule: InlineRule = {
  name: "if",
  startTokens: ["BLOCK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const parsed = parseConditional(ctx, "if");
    if (!parsed.success) {
      return { success: false };
    }

    return {
      success: true,
      elements: [createIfElement(parsed.head, parsed.thenElements, parsed.elseElements)],
      consumed: parsed.consumed,
    };
  },
};

export const ifExprRule: InlineRule = {
  name: "ifexpr",
  startTokens: ["BLOCK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const parsed = parseConditional(ctx, "ifexpr");
    if (!parsed.success) {
      return { success: false };
    }

    return {
      success: true,
      elements: [createIfExprElement(parsed.head, parsed.thenElements, parsed.elseElements)],
      consumed: parsed.consumed,
    };
  },
};
