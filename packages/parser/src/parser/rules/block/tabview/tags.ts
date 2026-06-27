import type { ParseContext } from "../../types";
import { parseBlockName } from "../utils";

export function isTabClose(ctx: ParseContext, pos: number): boolean {
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") return false;
  const closeNameResult = parseBlockName(ctx, pos + 1);
  return closeNameResult?.name.toLowerCase() === "tab";
}

export function isTabviewClose(ctx: ParseContext, pos: number): boolean {
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") return false;
  const closeNameResult = parseBlockName(ctx, pos + 1);
  const closeName = closeNameResult?.name.toLowerCase();
  return closeName === "tabview" || closeName === "tabs";
}

export function consumeNamedCloseTag(ctx: ParseContext, pos: number): number {
  let consumed = 1;
  const closeNameResult = parseBlockName(ctx, pos + 1);
  if (closeNameResult) {
    consumed += closeNameResult.consumed;
  }
  if (ctx.tokens[pos + consumed]?.type === "BLOCK_CLOSE") {
    consumed++;
  }
  if (ctx.tokens[pos + consumed]?.type === "NEWLINE") {
    consumed++;
  }
  return consumed;
}
