import type { InlineRule } from "../../types";
import { parseButtonSyntax } from "./syntax";

export const buttonRule: InlineRule = {
  name: "button",
  startTokens: ["BLOCK_OPEN"],
  parse(ctx) {
    const result = parseButtonSyntax(ctx, ctx.pos, ctx.scope.inlineEnd ?? ctx.tokens.length);
    return result
      ? {
          success: true,
          consumed: result.end - ctx.pos,
          elements: [{ element: "button", data: result.data }],
        }
      : { success: false };
  },
};
