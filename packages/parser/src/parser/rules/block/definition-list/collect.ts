import type { ParseContext } from "../../types";
import { parseDefinitionItem, type ParsedDefinitionItem } from "./items";

export interface DefinitionListParseResult {
  items: ParsedDefinitionItem[];
  consumed: number;
}

export function collectDefinitionItems(ctx: ParseContext): DefinitionListParseResult {
  const items: ParsedDefinitionItem[] = [];
  let pos = ctx.pos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF") {
      break;
    }

    if (token.type !== "COLON" || !token.lineStart) {
      break;
    }

    const result = parseDefinitionItem(ctx, pos);
    if (!result) {
      break;
    }

    items.push(result.item);
    pos += result.consumed;
    consumed += result.consumed;

    while (ctx.tokens[pos]?.type === "WHITESPACE") {
      pos++;
      consumed++;
    }
  }

  return { items, consumed };
}
