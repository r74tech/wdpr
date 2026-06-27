import type { ParseContext } from "../../types";
import { parseAttributes, parseBlockName } from "../utils";

export interface TableRowOpenResult {
  attrs: Record<string, string>;
  pos: number;
  consumed: number;
}

export function parseTableRowOpen(ctx: ParseContext, startPos: number): TableRowOpenResult | null {
  let pos = startPos;
  let consumed = 0;

  if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") {
    return null;
  }
  pos++;
  consumed++;

  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult || nameResult.name !== "row") {
    return null;
  }
  pos += nameResult.consumed;
  consumed += nameResult.consumed;

  const attrResult = parseAttributes(ctx, pos);
  pos += attrResult.consumed;
  consumed += attrResult.consumed;

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }
  pos++;
  consumed++;

  if (ctx.tokens[pos]?.type === "NEWLINE") {
    pos++;
    consumed++;
  }

  return {
    attrs: attrResult.attrs,
    pos,
    consumed,
  };
}

export function isTableRowClose(ctx: ParseContext, pos: number): boolean {
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") {
    return false;
  }

  return parseBlockName(ctx, pos + 1)?.name === "row";
}

export function consumeTableRowClose(ctx: ParseContext, startPos: number): number {
  let pos = startPos + 1;
  let consumed = 1;

  const closeNameResult = parseBlockName(ctx, pos);
  if (closeNameResult) {
    pos += closeNameResult.consumed;
    consumed += closeNameResult.consumed;
  }
  if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
    pos++;
    consumed++;
  }
  if (ctx.tokens[pos]?.type === "NEWLINE") {
    consumed++;
  }

  return consumed;
}
