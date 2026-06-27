import type { ParseContext } from "../../types";
import { parseAttributes } from "../../block/utils";
import { isAnchorBlockName, parseAnchorBlockName } from "./syntax";

export interface AnchorOpenResult {
  name: string;
  paragraphStrip: boolean;
  attributes: Record<string, string>;
  bodyStart: number;
  consumed: number;
}

export function parseAnchorOpen(ctx: ParseContext): AnchorOpenResult | null {
  if (ctx.tokens[ctx.pos]?.type !== "BLOCK_OPEN") {
    return null;
  }

  let pos = ctx.pos + 1;
  let consumed = 1;

  const nameResult = parseAnchorBlockName(ctx, pos);
  if (!nameResult || !isAnchorBlockName(nameResult.name)) {
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

  return {
    name: nameResult.name,
    paragraphStrip: nameResult.paragraphStrip,
    attributes: attrResult.attrs,
    bodyStart: pos,
    consumed,
  };
}
