import type { Element } from "@wdprlib/ast";
import type { InlineRule, ParseContext, RuleResult } from "../../types";
import { createPreservedLineBreak } from "./elements";

export const backslashLineBreakRule: InlineRule = {
  name: "backslashLineBreak",
  startTokens: ["WHITESPACE", "BACKSLASH_BREAK"],

  parse(ctx: ParseContext): RuleResult<Element> {
    const currentTok = ctx.tokens[ctx.pos];
    if (!currentTok) {
      return { success: false };
    }

    if (currentTok.type === "WHITESPACE") {
      const nextTok = ctx.tokens[ctx.pos + 1];
      if (nextTok?.type !== "BACKSLASH_BREAK") {
        return { success: false };
      }

      if (isFollowedByUnderscoreBreak(ctx, ctx.pos + 2)) {
        return {
          success: true,
          elements: [createPreservedLineBreak()],
          consumed: 2,
        };
      }

      return {
        success: true,
        elements: [createPreservedLineBreak(), { element: "text", data: " " }],
        consumed: 2,
      };
    }

    if (currentTok.type === "BACKSLASH_BREAK") {
      return {
        success: true,
        elements: [createPreservedLineBreak()],
        consumed: 1,
      };
    }

    return { success: false };
  },
};

function isFollowedByUnderscoreBreak(ctx: ParseContext, startPos: number): boolean {
  const afterBreak = ctx.tokens[startPos];
  const afterAfter = ctx.tokens[startPos + 1];
  const afterAfterAfter = ctx.tokens[startPos + 2];

  return (
    afterBreak?.type === "WHITESPACE" &&
    afterAfter?.type === "UNDERSCORE" &&
    (afterAfterAfter?.type === "NEWLINE" || afterAfterAfter?.type === "EOF")
  );
}
