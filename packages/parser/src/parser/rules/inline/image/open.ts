import type { ParseContext } from "../../types";
import { parseImageAttributes } from "./attributes";
import { parseImageSourceText } from "./body";
import { isImageBlockName, parseImageBlockName } from "./syntax";

export interface ImageOpenResult {
  blockName: string;
  sourceText: string;
  link: string | null;
  attributes: Record<string, string>;
  consumed: number;
}

export function parseImageOpen(ctx: ParseContext): ImageOpenResult | null {
  if (ctx.tokens[ctx.pos]?.type !== "BLOCK_OPEN") {
    return null;
  }

  let pos = ctx.pos + 1;
  let consumed = 1;

  const nameResult = parseImageBlockName(ctx, pos);
  if (!nameResult || !isImageBlockName(nameResult.name)) {
    return null;
  }

  pos += nameResult.consumed;
  consumed += nameResult.consumed;

  const sourceText = parseImageSourceText(ctx, pos);
  pos += sourceText.consumed;
  consumed += sourceText.consumed;

  const attrs = parseImageAttributes(ctx, pos);
  pos += attrs.consumed;
  consumed += attrs.consumed;

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }

  pos++;
  consumed++;

  if (!sourceText.sourceText) {
    return null;
  }

  return {
    blockName: nameResult.name,
    sourceText: sourceText.sourceText,
    link: attrs.link,
    attributes: attrs.attributes,
    consumed,
  };
}
