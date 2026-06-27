import type { ParseContext } from "../../types";
import { parseBlockName } from "../utils";
import { parseMultilineAttributes, type CollapsibleAttributes } from "./attributes";

export interface CollapsibleOpenResult {
  attrs: CollapsibleAttributes;
  bodyStart: number;
  consumed: number;
  hasNewlineAfterOpen: boolean;
}

export function parseCollapsibleOpen(ctx: ParseContext): CollapsibleOpenResult | null {
  if (ctx.tokens[ctx.pos]?.type !== "BLOCK_OPEN") {
    return null;
  }

  let pos = ctx.pos + 1;
  let consumed = 1;

  const nameResult = parseBlockName(ctx, pos);
  if (!nameResult || nameResult.name !== "collapsible") {
    return null;
  }

  pos += nameResult.consumed;
  consumed += nameResult.consumed;

  const attrResult = parseMultilineAttributes(ctx, pos);
  pos += attrResult.consumed;
  consumed += attrResult.consumed;

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }

  pos++;
  consumed++;

  const hasNewlineAfterOpen = ctx.tokens[pos]?.type === "NEWLINE";
  if (hasNewlineAfterOpen) {
    pos++;
    consumed++;
  }

  return {
    attrs: attrResult.attrs,
    bodyStart: pos,
    consumed,
    hasNewlineAfterOpen,
  };
}
