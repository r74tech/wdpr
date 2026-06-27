import type { ParseContext } from "../../types";
import { KNOWN_BLOCK_NAMES } from "../../../constants";
import { parseBlockName } from "../utils";

/**
 * Whether the BLOCK_OPEN / BLOCK_END_OPEN token at `pos` opens a block name
 * that should not end the surrounding paragraph / inline run.
 */
export function isNonBoundaryBlockToken(ctx: ParseContext, pos: number): boolean {
  const token = ctx.tokens[pos];
  if (token?.type !== "BLOCK_OPEN" && token?.type !== "BLOCK_END_OPEN") {
    return false;
  }

  const nameResult = parseBlockName(ctx, pos + 1);
  if (nameResult === null) {
    return ctx.tokens[pos + 1]?.type !== "EQUALS";
  }

  if (ctx.scope.excludedBlockNames?.has(nameResult.name)) {
    return true;
  }
  return !KNOWN_BLOCK_NAMES.has(nameResult.name);
}
