import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseBlocksUntil } from "../utils";
import { type AlignDirection, parseAlignClose } from "./syntax";

export interface AlignBodyResult {
  elements: Element[];
  consumed: number;
  foundClose: boolean;
}

export function parseAlignBody(
  ctx: ParseContext,
  startPos: number,
  direction: AlignDirection,
): AlignBodyResult {
  const bodyCtx: ParseContext = { ...ctx, pos: startPos };
  const bodyResult = parseBlocksUntil(bodyCtx, (checkCtx) => {
    return parseAlignClose(checkCtx, direction).match;
  });

  let pos = startPos + bodyResult.consumed;
  let consumed = bodyResult.consumed;

  const closeCheck = parseAlignClose({ ...ctx, pos }, direction);
  if (!closeCheck.match) {
    return {
      elements: bodyResult.elements,
      consumed,
      foundClose: false,
    };
  }

  consumed += closeCheck.consumed;
  pos += closeCheck.consumed;

  if (ctx.tokens[pos]?.type === "NEWLINE") {
    consumed++;
  }

  return {
    elements: bodyResult.elements,
    consumed,
    foundClose: true,
  };
}
