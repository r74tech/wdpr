import type { ParseContext } from "../../types";
import { parseAttributes, parseBlockName } from "../utils";

export interface BibliographyOpenResult {
  title: string | null;
  hide: boolean;
  pos: number;
  consumed: number;
}

export function parseBibliographyOpen(
  ctx: ParseContext,
  startPos: number,
): BibliographyOpenResult | null {
  let pos = startPos;
  let consumed = 0;

  if (ctx.tokens[pos]?.type !== "BLOCK_OPEN") {
    return null;
  }
  pos++;
  consumed++;

  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult || nameResult.name !== "bibliography") {
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
    title: attrResult.attrs.title ?? null,
    hide: attrResult.attrs.hide === "true" || attrResult.attrs.hide === "",
    pos,
    consumed,
  };
}
