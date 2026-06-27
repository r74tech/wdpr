import type { AttributeMap } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseBlockName } from "../utils";
import { parseIframeAttributes } from "./attributes";
import { parseIframeSource } from "./source";

export interface IframeOpenResult {
  url: string;
  attributes: AttributeMap;
  consumed: number;
}

export function parseIframeOpen(ctx: ParseContext): IframeOpenResult | null {
  if (ctx.tokens[ctx.pos]?.type !== "BLOCK_OPEN") {
    return null;
  }

  let pos = ctx.pos + 1;
  let consumed = 1;

  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult || nameResult.name.toLowerCase() !== "iframe") {
    return null;
  }

  pos += nameResult.consumed;
  consumed += nameResult.consumed;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  const sourceResult = parseIframeSource(ctx, pos);
  if (!sourceResult) {
    return null;
  }

  pos += sourceResult.consumed;
  consumed += sourceResult.consumed;

  const attrResult = parseIframeAttributes(ctx, pos);
  pos += attrResult.consumed;
  consumed += attrResult.consumed;

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }

  pos++;
  consumed++;

  if (ctx.tokens[pos]?.type === "NEWLINE") {
    consumed++;
  }

  return { url: sourceResult.url, attributes: attrResult.attributes, consumed };
}
