import type { ParseContext } from "../../types";

const IMAGE_BLOCK_NAMES = new Set(["image", "=image", "<image", ">image", "f<image", "f>image", "f=image"]);

export interface ImageBlockName {
  name: string;
  consumed: number;
}

export function parseImageBlockName(ctx: ParseContext, startPos: number): ImageBlockName | null {
  let pos = startPos;
  let consumed = 0;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  const prefixResult = parseImagePrefix(ctx, pos);
  const prefix = prefixResult.prefix;
  pos += prefixResult.consumed;
  consumed += prefixResult.consumed;

  const nameToken = ctx.tokens[pos];
  if (!nameToken || (nameToken.type !== "TEXT" && nameToken.type !== "IDENTIFIER")) {
    return null;
  }

  return { name: prefix + nameToken.value.toLowerCase(), consumed: consumed + 1 };
}

export function isImageBlockName(blockName: string): boolean {
  return IMAGE_BLOCK_NAMES.has(blockName);
}

function parseImagePrefix(ctx: ParseContext, pos: number): { prefix: string; consumed: number } {
  const token = ctx.tokens[pos];

  if (token?.type === "EQUALS") {
    return { prefix: "=", consumed: 1 };
  }
  if (token?.type === "TEXT" && token.value === "<") {
    return { prefix: "<", consumed: 1 };
  }
  if (
    (token?.type === "TEXT" || token?.type === "BLOCKQUOTE_MARKER") &&
    token.value === ">"
  ) {
    return { prefix: ">", consumed: 1 };
  }
  if (token?.type === "IDENTIFIER" && token.value.toLowerCase() === "f") {
    return parseFloatPrefix(ctx, pos + 1);
  }

  return { prefix: "", consumed: 0 };
}

function parseFloatPrefix(ctx: ParseContext, pos: number): { prefix: string; consumed: number } {
  const token = ctx.tokens[pos];
  if (token?.type === "TEXT" && token.value === "<") {
    return { prefix: "f<", consumed: 2 };
  }
  if (
    (token?.type === "TEXT" || token?.type === "BLOCKQUOTE_MARKER") &&
    token.value === ">"
  ) {
    return { prefix: "f>", consumed: 2 };
  }
  if (token?.type === "EQUALS") {
    return { prefix: "f=", consumed: 2 };
  }

  return { prefix: "", consumed: 0 };
}
