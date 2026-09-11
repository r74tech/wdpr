/**
 *
 * Parses the Wikidot footnote syntax: `[[footnote]]content[[/footnote]]`.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { parseFootnoteContent } from "./content";
import { buildFootnoteChildren } from "./elements";
import { parseFootnoteOpen } from "./open";

export const footnoteRule: InlineRule = {
  name: "footnote",
  startTokens: ["BLOCK_OPEN"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const openToken = currentToken(ctx);
    if (openToken.type !== "BLOCK_OPEN") {
      return { success: false };
    }

    const openResult = parseFootnoteOpen(ctx);
    if (!openResult) {
      return { success: false };
    }

    const contentResult = parseFootnoteContent(ctx, openResult.bodyStart);
    const consumed = openResult.consumed + contentResult.consumed;
    const children = buildFootnoteChildren(
      contentResult.elements,
      contentResult.leadingParagraphBreak,
    );

    if (!contentResult.foundClose) {
      ctx.diagnostics.push({
        severity: "warning",
        code: "unclosed-block",
        message: "Missing closing tag [[/footnote]] for [[footnote]]",
        position: openToken.position,
      });
    }

    ctx.footnotes.push(children);

    return {
      success: true,
      elements: [
        {
          element: "footnote",
        },
      ],
      consumed,
    };
  },
};
