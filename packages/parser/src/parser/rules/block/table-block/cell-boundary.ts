import type { ParseContext } from "../../types";
import { parseAttributes, parseBlockName } from "../utils";

export type TableCellTagName = "cell" | "hcell";

export interface TableCellOpenResult {
  tagName: TableCellTagName;
  isHeader: boolean;
  attrs: Record<string, string>;
  pos: number;
  consumed: number;
}

export function parseTableCellOpen(
  ctx: ParseContext,
  startPos: number,
): TableCellOpenResult | null {
  let pos = startPos;
  let consumed = 0;

  if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") {
    return null;
  }
  pos++;
  consumed++;

  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult || !isTableCellTagName(nameResult.name)) {
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
    tagName: nameResult.name,
    isHeader: nameResult.name === "hcell",
    attrs: attrResult.attrs,
    pos,
    consumed,
  };
}

export function isTableCellClose(
  ctx: ParseContext,
  pos: number,
  closeName: TableCellTagName,
): boolean {
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") {
    return false;
  }

  return parseBlockName(ctx, pos + 1)?.name === closeName;
}

export function createCellCloseCondition(
  closeName: TableCellTagName,
): (ctx: ParseContext) => boolean {
  return (ctx: ParseContext): boolean => isTableCellClose(ctx, ctx.pos, closeName);
}

export function consumeTableCellClose(ctx: ParseContext, startPos: number): number {
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

function isTableCellTagName(name: string): name is TableCellTagName {
  return name === "cell" || name === "hcell";
}
