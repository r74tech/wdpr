import type { ParseContext } from "../../types";
import { parseAttributesRaw, parseBlockName } from "../utils";

export interface HtmlOpenResult {
  style: string | undefined;
  consumed: number;
}

export function parseHtmlOpen(ctx: ParseContext, startPos: number): HtmlOpenResult | null {
  if (ctx.tokens[startPos]?.type !== "BLOCK_OPEN") {
    return null;
  }

  let pos = startPos + 1;
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

  return {
    style: attrResult.attrs.style,
    consumed: consumed + 1,
  };
}
