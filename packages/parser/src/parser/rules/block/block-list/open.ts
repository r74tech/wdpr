import type { ParseContext } from "../../types";
import { parseAttributes, parseBlockName } from "../utils";
import { isListBlockType, type ListBlockType } from "./tags";

export interface ListBlockOpenResult {
  listType: ListBlockType;
  attrs: Record<string, string>;
  pos: number;
  consumed: number;
}

export function parseListBlockOpen(
  ctx: ParseContext,
  startPos: number,
): ListBlockOpenResult | null {
  let pos = startPos;
  let consumed = 0;

  if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") return null;
  pos++;
  consumed++;

  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult || !isListBlockType(nameResult.name)) {
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
    listType: nameResult.name,
    attrs: attrResult.attrs,
    pos,
    consumed,
  };
}
