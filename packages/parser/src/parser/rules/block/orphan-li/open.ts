import type { ParseContext } from "../../types";
import { isLiOpen } from "./tags";

export interface OrphanLiOpenResult {
  bodyStart: number;
  consumed: number;
}

export function parseOrphanLiOpen(ctx: ParseContext): OrphanLiOpenResult | null {
  const liOpen = isLiOpen(ctx, ctx.pos);
  if (!liOpen) {
    return null;
  }

  const closePos = ctx.pos + liOpen.consumed;
  if (ctx.tokens[closePos]?.type !== "BLOCK_CLOSE") {
    return null;
  }

  const consumed = liOpen.consumed + 1;
  return {
    bodyStart: ctx.pos + consumed,
    consumed,
  };
}
