import type { Element } from "@wdprlib/ast";
import type { ParseContext } from "../../types";
import { parseInlineUntil } from "../../inline/utils";

export interface DefinitionItemValueResult {
  value: Element[];
  consumed: number;
}

export function parseDefinitionItemValue(
  ctx: ParseContext,
  startPos: number,
): DefinitionItemValueResult {
  const value: Element[] = [];
  let pos = startPos;
  let consumed = 0;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    if (token.type === "NEWLINE") {
      consumed++;
      break;
    }

    const inlineCtx: ParseContext = { ...ctx, pos };
    const result = parseInlineUntil(inlineCtx, "NEWLINE");
    if (result.elements.length > 0) {
      value.push(...result.elements);
      pos += result.consumed;
      consumed += result.consumed;
    } else {
      pos++;
      consumed++;
    }
  }

  return { value, consumed };
}
