import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseBlockName, parseBlocksUntil } from "../utils";

export interface IftagsBodyResult {
  elements: Element[];
  consumed: number;
}

export function parseIftagsBody(ctx: ParseContext, startPos: number): IftagsBodyResult {
  const bodyCtx: ParseContext = { ...ctx, pos: startPos };
  const bodyResult = parseBlocksUntil(bodyCtx, (checkCtx) => isIftagsClose(checkCtx, checkCtx.pos));

  return {
    elements: bodyResult.elements,
    consumed: bodyResult.consumed,
  };
}

export function isIftagsClose(ctx: ParseContext, pos: number): boolean {
  const token = ctx.tokens[pos];
  if (token?.type !== "BLOCK_END_OPEN") {
    return false;
  }

  const closeNameResult = parseBlockName(ctx, pos + 1);
  return closeNameResult?.name.toLowerCase() === "iftags";
}

export function consumeIftagsClose(ctx: ParseContext, startPos: number): number {
  let pos = startPos + 1;
  let consumed = 1;

  const closeNameResult = parseBlockName(ctx, pos);
  if (closeNameResult) {
    pos += closeNameResult.consumed;
    consumed += closeNameResult.consumed;
  }
  if (ctx.tokens[pos]?.type === "BLOCK_CLOSE") {
    pos++;
    consumed++;
  }
  if (ctx.tokens[pos]?.type === "NEWLINE") {
    consumed++;
  }

  return consumed;
}
