import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../../types";
import { createPreservedLineBreak } from "./elements";

export const underscoreLineBreakRule: InlineRule = {
  name: "underscoreLineBreak",
  startTokens: ["WHITESPACE", "UNDERSCORE"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const currentTok = ctx.tokens[ctx.pos];
    if (!currentTok) {
      return { success: false };
    }

    if (currentTok.type === "WHITESPACE") {
      const nextTok = ctx.tokens[ctx.pos + 1];
      const afterTok = ctx.tokens[ctx.pos + 2];

      if (
        nextTok?.type === "UNDERSCORE" &&
        afterTok &&
        (afterTok.type === "NEWLINE" || afterTok.type === "EOF")
      ) {
        return {
          success: true,
          elements: [createPreservedLineBreak()],
          consumed: 3,
        };
      }
    }

    if (currentTok.type === "UNDERSCORE" && currentTok.lineStart) {
      const nextTok = ctx.tokens[ctx.pos + 1];
      if (nextTok && (nextTok.type === "NEWLINE" || nextTok.type === "EOF")) {
        return {
          success: true,
          elements: [createPreservedLineBreak()],
          consumed: 2,
        };
      }
    }

    return { success: false };
  },
};
