/**
 *
 * Parses the Wikidot font size syntax: `[[size value]]text[[/size]]`.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { parseSizeContent } from "./content";
import { parseSizeOpen } from "./open";

export const sizeRule: InlineRule = {
  name: "size",
  startTokens: ["BLOCK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    const openResult = parseSizeOpen(ctx);
    if (!openResult) {
      return { success: false };
    }

    const contentResult = parseSizeContent(ctx, openResult.bodyStart);
    const consumed = openResult.consumed + contentResult.consumed;

    if (!contentResult.foundClose) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: "Missing closing tag [[/size]] for [[size]]",
        position: openToken.position,
      });
    }

    return {
      success: true,
      elements: [
        {
          element: "container",
          data: {
            type: "size",
            attributes: { style: `font-size:${openResult.size};` },
            elements: contentResult.children,
          },
        },
      ],
      consumed,
    };
  },
};
