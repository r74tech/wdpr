import type { ParseContext } from "../../types";
import { findFormattingClose } from "../formatting/close";

export function hasValidStrikethroughClose(ctx: ParseContext): boolean {
  const close = findFormattingClose(ctx, ctx.pos + 1, "STRIKE_MARKER");
  return close !== null && close > ctx.pos + 1 && ctx.tokens[close - 1]?.type !== "WHITESPACE";
}
