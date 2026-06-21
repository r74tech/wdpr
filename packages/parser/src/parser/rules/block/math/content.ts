import type { ParseContext } from "../../types";
import { parseBlockName } from "../utils";

export interface MathContentResult {
  latexSource: string;
  consumed: number;
  foundClose: boolean;
}

export function collectMathContent(ctx: ParseContext, startPos: number): MathContentResult {
  let latexSource = "";
  let pos = startPos;
  let consumed = 0;
  let foundClose = false;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token) break;

    if (token.type === "BLOCK_END_OPEN") {
      const closeNameResult = parseBlockName(ctx, pos + 1);
      if (closeNameResult?.name === "math") {
        foundClose = true;
        break;
      }
    }

    latexSource += token.type === "BACKSLASH_BREAK" ? "\\\n" : token.value;
    pos++;
    consumed++;
  }

  return { latexSource, consumed, foundClose };
}

export function consumeMathClose(ctx: ParseContext, startPos: number): number {
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
