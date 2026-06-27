import type { ParseContext } from "../../types";
import { parseFootnoteBlockAttributes } from "./attributes";

export interface FootnoteBlockOpenResult {
  attrs: Record<string, string>;
  consumed: number;
}

export function parseFootnoteBlockOpen(
  ctx: ParseContext,
  startPos: number,
): FootnoteBlockOpenResult | null {
  if (ctx.tokens[startPos]?.type !== "BLOCK_OPEN") {
    return null;
  }

  let pos = startPos + 1;
  let consumed = 1;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  const nameToken = ctx.tokens[pos];
  if (!nameToken || (nameToken.type !== "TEXT" && nameToken.type !== "IDENTIFIER")) {
    return null;
  }

  if (nameToken.value.toLowerCase() !== "footnoteblock") {
    return null;
  }
  pos++;
  consumed++;

  const attrResult = parseFootnoteBlockAttributes(ctx, pos);
  pos += attrResult.consumed;
  consumed += attrResult.consumed;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }

  return {
    attrs: attrResult.attrs,
    consumed: consumed + 1,
  };
}
