import type { ParseContext } from "../../types";
import { parseBlockName } from "../utils";

export interface TagMatch {
  consumed: number;
}

/**
 * Tests whether the tokens at `pos` form a `[[li]]` opening tag.
 * Only the exact name `"li"` matches; `[[li_]]` is not recognised.
 */
export function isLiOpen(ctx: ParseContext, pos: number): TagMatch | null {
  if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") return null;

  const nameResult = parseBlockName(ctx, pos + 1);
  if (nameResult?.name !== "li") {
    return null;
  }

  return { consumed: 1 + nameResult.consumed };
}

/**
 * Tests whether the tokens at `pos` form a `[[/li]]` closing tag.
 */
export function isLiClose(ctx: ParseContext, pos: number): TagMatch | null {
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") return null;

  const nameResult = parseBlockName(ctx, pos + 1);
  if (nameResult?.name !== "li") {
    return null;
  }

  let consumed = 1 + nameResult.consumed;
  if (ctx.tokens[pos + consumed]?.type === "BLOCK_CLOSE") {
    consumed++;
  }

  return { consumed };
}
