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

    const content = parseSpanContent(ctx, opener.pos, opener.blockName);
    if (!content.foundClose) {
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
