import type { ParseContext } from "../../types";
import { parseAttributesRaw, parseBlockName } from "../../block/utils";

export interface HtmlInlineOpenResult {
  bodyStart: number;
  consumed: number;
}

export function parseHtmlInlineOpen(ctx: ParseContext): HtmlInlineOpenResult | null {
  if (ctx.tokens[ctx.pos]?.type !== "BLOCK_OPEN") {
    return null;
  }

  let pos = ctx.pos + 1;
  let consumed = 1;

  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult || nameResult.name.toLowerCase() !== "html") {
    return null;
  }

  pos += nameResult.consumed;
  consumed += nameResult.consumed;

  const attrResult = parseAttributesRaw(ctx, pos);
  pos += attrResult.consumed;
  consumed += attrResult.consumed;

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }

  pos++;
  consumed++;

  return { bodyStart: pos, consumed };
}
