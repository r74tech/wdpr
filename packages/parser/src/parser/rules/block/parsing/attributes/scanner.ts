import type { Token } from "../../../../../lexer";
import type { ParseContext } from "../../../types";
import { consumeAttributeName, isAttributeNameToken } from "./names";
import { consumeAttributeValue } from "./values";

export interface AttributeParseResult {
  attrs: Record<string, string>;
  consumed: number;
}

interface AttributeScanOptions {
  hyphenatedNames: boolean;
  strikeHyphens: boolean;
}

export function scanAttributes(
  ctx: ParseContext,
  startPos: number,
  options: AttributeScanOptions,
): AttributeParseResult {
  const attrs: Record<string, string> = {};
  let pos = startPos;
  let consumed = 0;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || isAttributeTerminator(token)) {
      break;
    }

    if (token.type === "WHITESPACE") {
      pos++;
      consumed++;
      continue;
    }

    if (!isAttributeNameToken(token)) {
      pos++;
      consumed++;
      continue;
    }

    let name = token.value;
    pos++;
    consumed++;

    const nameResult = consumeAttributeName(ctx, pos, consumed, name, options);
    pos = nameResult.pos;
    consumed = nameResult.consumed;
    name = nameResult.name.toLowerCase();

    if (ctx.tokens[pos]?.type !== "EQUALS") {
      attrs[name] = "true";
      continue;
    }

    pos++;
    consumed++;

    const valueResult = consumeAttributeValue(ctx.tokens[pos]);
    if (!valueResult) {
      continue;
    }

    attrs[name] = valueResult.value;
    pos++;
    consumed++;
  }

  return { attrs, consumed };
}

function isAttributeTerminator(token: Token): boolean {
  return token.type === "BLOCK_CLOSE" || token.type === "NEWLINE" || token.type === "EOF";
}
