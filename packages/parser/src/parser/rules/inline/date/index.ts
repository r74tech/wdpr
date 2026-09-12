import type { InlineRule } from "../../types";
import { parseDateSyntax } from "./syntax";

export const dateRule: InlineRule = {
  name: "date",
  startTokens: ["BLOCK_OPEN"],
  parse(ctx) {
    const parsed = parseDateSyntax(ctx, ctx.pos, ctx.scope.inlineEnd ?? ctx.tokens.length);
    return parsed
      ? {
          success: true,
          consumed: parsed.end - ctx.pos,
          elements: [{ element: "date", data: parsed.data }],
        }
      : { success: false };
  },
};
