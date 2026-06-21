import type { ParseContext } from "../../types";
import { parseBlockName } from "../utils";

export type ListBlockType = "ul" | "ol";

export function isListBlockType(name: string): name is ListBlockType {
  return name === "ul" || name === "ol";
}

export function isListClose(
  ctx: ParseContext,
  pos: number,
  expectedType?: ListBlockType,
): boolean {
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") return false;
  const nameResult = parseBlockName(ctx, pos + 1);
  if (!nameResult) return false;
  return expectedType ? nameResult.name === expectedType : isListBlockType(nameResult.name);
}

export function isLiClose(ctx: ParseContext, pos: number): boolean {
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") return false;
  const nameResult = parseBlockName(ctx, pos + 1);
  return nameResult?.name === "li";
}

export function isLiOpen(
  ctx: ParseContext,
  pos: number,
): { name: string; consumed: number } | null {
  if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") return null;
  const nameResult = parseBlockName(ctx, pos + 1);
  if (!nameResult || nameResult.name !== "li") return null;
  return { name: nameResult.name, consumed: 1 + nameResult.consumed };
}

export function isNestedListOpen(
  ctx: ParseContext,
  pos: number,
): { type: ListBlockType; consumed: number } | null {
  if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") return null;
  const nameResult = parseBlockName(ctx, pos + 1);
  if (!nameResult || !isListBlockType(nameResult.name)) return null;
  return { type: nameResult.name, consumed: 1 + nameResult.consumed };
}

export function consumeCloseTag(ctx: ParseContext, pos: number): number {
  let closeConsumed = 1;
  const nameResult = parseBlockName(ctx, pos + 1);
  if (nameResult) closeConsumed += nameResult.consumed;
  if (ctx.tokens[pos + closeConsumed]?.type === "BLOCK_CLOSE") closeConsumed++;
  if (ctx.tokens[pos + closeConsumed]?.type === "NEWLINE") closeConsumed++;
  return closeConsumed;
}
