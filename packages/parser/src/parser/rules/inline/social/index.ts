import type { InlineRule } from "../../types";
import { parseSocialSyntax } from "./syntax";

export const socialRule: InlineRule = {
  name: "social",
  startTokens: ["BLOCK_OPEN"],
  parse(ctx) {
    const result = parseSocialSyntax(ctx, ctx.pos, ctx.scope.inlineEnd ?? ctx.tokens.length);
    return result
      ? {
          success: true,
          consumed: result.end - ctx.pos,
          elements: [{ element: "social", data: result.data }],
        }
      : { success: false };
  },
};
