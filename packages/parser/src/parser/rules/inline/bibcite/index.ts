/**
 *
 * Parses the Wikidot bibliography citation syntax: `((bibcite label))`.
 *
 * @module
 */
import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../../types";
import { currentToken } from "../../types";
import { buildBibliographyCitation } from "./element";
import { parseBibciteLabel } from "./syntax";

export const bibciteRule: InlineRule = {
  name: "bibcite",
  startTokens: ["TEXT"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const token = currentToken(ctx);
    if (token.type !== "TEXT" || token.value !== "(") {
      return { success: false };
    }

    const parsed = parseBibciteLabel(ctx, ctx.pos);
    if (!parsed) {
      return { success: false };
    }

    return {
      success: true,
      elements: [buildBibliographyCitation(ctx, parsed.label)],
      consumed: parsed.consumed,
    };
  },
};
