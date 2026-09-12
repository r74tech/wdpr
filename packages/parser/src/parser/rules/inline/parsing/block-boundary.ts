import { findNoteBounds } from "../../block/note/boundary";
import type { ParseContext } from "../../types";
import { INDENT_ACCEPTING_BLOCK_NAMES, KNOWN_BLOCK_NAMES } from "../../../constants";
import { parseBlockName } from "../../common";

/**
 * Checks whether the block token at `tokenPos` names a block in the excluded set.
 */
export function isExcludedBlockToken(ctx: ParseContext, tokenPos: number): boolean {
  const excluded = ctx.scope.excludedBlockNames;
  if (!excluded?.size) return false;
  const token = ctx.tokens[tokenPos];
  if (token?.type !== "BLOCK_OPEN" && token?.type !== "BLOCK_END_OPEN") return false;
  const nameResult = parseBlockName(ctx, tokenPos + 1);
  return nameResult !== null && excluded.has(nameResult.name);
}

/**
 * Checks whether the block token at `tokenPos` names a block that no rule recognizes.
 */
export function isUnknownBlockToken(ctx: ParseContext, tokenPos: number): boolean {
  const token = ctx.tokens[tokenPos];
  if (token?.type !== "BLOCK_OPEN" && token?.type !== "BLOCK_END_OPEN") return false;
  const nameResult = parseBlockName(ctx, tokenPos + 1);
  if (nameResult === null) {
    if (ctx.tokens[tokenPos + 1]?.type === "EQUALS") {
      return false;
    }
    return true;
  }
  if (nameResult.name === "note") return findNoteBounds(ctx, tokenPos) === null;
  return !KNOWN_BLOCK_NAMES.has(nameResult.name);
}

/**
 * Checks whether the block token at `tokenPos` names a block whose rule accepts indentation.
 */
export function isIndentAcceptingBlock(ctx: ParseContext, tokenPos: number): boolean {
  const token = ctx.tokens[tokenPos];
  if (token?.type !== "BLOCK_OPEN" && token?.type !== "BLOCK_END_OPEN") return false;
  const nameResult = parseBlockName(ctx, tokenPos + 1);
  if (nameResult === null) return false;
  return INDENT_ACCEPTING_BLOCK_NAMES.has(nameResult.name);
}
