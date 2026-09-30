/**
 * Inline rules for `[[span]]` and orphaned `[[/span]]`.
 *
 * @module
 */

import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { buildSpanElements } from "./elements";
import { parseCloseSpan, parseSpanOpener } from "./syntax";
import { parseSpanContent } from "./content";

/**
 * Span openers already known to have no closing tag under an identical scope.
 *
 * Formatting that spans across `[[/span]]` can make a span consume later
 * paragraphs, and every failed attempt is retried by each enclosing rule.
 * Without this cache, `[[span]]**a[[/span]][[span]]b**[[/span]]` repeated
 * n times fails 2^n - 1 times at only n distinct positions.
 */
const failedSpans = new WeakMap<ParseContext["tokens"], Set<string>>();
const scopeRefIds = new WeakMap<object, number>();
let nextScopeRefId = 1;

function refId(value: object | undefined): number {
  if (value === undefined) return 0;
  let id = scopeRefIds.get(value);
  if (id === undefined) {
    id = nextScopeRefId++;
    scopeRefIds.set(value, id);
  }
  return id;
}

/** Null when the scope carries mutable table state, which makes failures non-repeatable. */
function failureKey(ctx: ParseContext): string | null {
  const scope = ctx.scope;
  if (scope.tableFormatting) return null;
  return [
    ctx.pos,
    scope.inlineEnd ?? -1,
    scope.suppressEmailLinks === true ? 1 : 0,
    refId(scope.blockCloseCondition),
    refId(scope.excludedBlockNames),
    scope.divClosesBudget ?? -1,
    scope.footnoteBlockParsed ? 1 : 0,
  ].join(":");
}

export const spanRule: InlineRule = {
  name: "span",
  startTokens: ["BLOCK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    const opener = parseSpanOpener(ctx);
    if (!opener.success) {
      return { success: false };
    }

    const key = failureKey(ctx);
    const failed = failedSpans.get(ctx.tokens);
    if (key !== null && failed?.has(key)) {
      return { success: false };
    }

    const content = parseSpanContent(ctx, opener.pos, opener.blockName);
    if (!content.foundClose) {
      if (key !== null) {
        if (failed) failed.add(key);
        else failedSpans.set(ctx.tokens, new Set([key]));
      }
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: `Missing closing tag [[/span]] for [[${opener.blockName}]]`,
        position: openToken.position,
      });
      return { success: false };
    }

    return {
      success: true,
      elements: buildSpanElements(opener.blockName, opener.attributes, content),
      consumed: opener.consumed + content.consumed,
    };
  },
};

export const closeSpanRule: InlineRule = {
  name: "closeSpan",
  startTokens: ["BLOCK_END_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const token = currentToken(ctx);
    if (token.type !== "BLOCK_END_OPEN") {
      return { success: false };
    }

    const close = parseCloseSpan(ctx, ctx.pos);
    if (!close.success) {
      return { success: false };
    }

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: "span",
            attributes: {},
            elements: [],
            _closeSpan: true,
          },
        },
      ],
      consumed: close.consumed,
    };
  },
};
