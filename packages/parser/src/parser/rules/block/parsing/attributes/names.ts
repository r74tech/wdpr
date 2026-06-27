import type { Token } from "../../../../../lexer";
import type { ParseContext } from "../../../types";

export interface AttributeNameOptions {
  hyphenatedNames: boolean;
  strikeHyphens: boolean;
}

export interface AttributeNameResult {
  name: string;
  pos: number;
  consumed: number;
}

export function consumeAttributeName(
  ctx: ParseContext,
  startPos: number,
  startConsumed: number,
  startName: string,
  options: AttributeNameOptions,
): AttributeNameResult {
  return options.strikeHyphens
    ? consumeRawNameSuffix(ctx, startPos, startConsumed, startName, options.hyphenatedNames)
    : consumeSafeNameSuffix(ctx, startPos, startConsumed, startName);
}

export function isAttributeNameToken(token: Token | undefined): token is Token {
  return token?.type === "TEXT" || token?.type === "IDENTIFIER";
}

function consumeSafeNameSuffix(
  ctx: ParseContext,
  startPos: number,
  startConsumed: number,
  startName: string,
): AttributeNameResult {
  let name = startName;
  let pos = startPos;
  let consumed = startConsumed;

  while (
    ctx.tokens[pos]?.type === "TEXT" &&
    ctx.tokens[pos]?.value === "-" &&
    isAttributeNameToken(ctx.tokens[pos + 1])
  ) {
    name += "-";
    pos++;
    consumed++;
    name += ctx.tokens[pos]?.value ?? "";
    pos++;
    consumed++;
  }

  return { name, pos, consumed };
}

function consumeRawNameSuffix(
  ctx: ParseContext,
  startPos: number,
  startConsumed: number,
  startName: string,
  hyphenatedNames: boolean,
): AttributeNameResult {
  let name = startName;
  let pos = startPos;
  let consumed = startConsumed;

  while (isHyphenToken(ctx.tokens[pos])) {
    while (isHyphenToken(ctx.tokens[pos])) {
      if (hyphenatedNames) {
        name += ctx.tokens[pos]?.value ?? "-";
      }
      pos++;
      consumed++;
    }

    if (!isAttributeNameToken(ctx.tokens[pos])) {
      break;
    }

    if (hyphenatedNames) {
      name += ctx.tokens[pos]?.value ?? "";
    }
    pos++;
    consumed++;
  }

  return { name, pos, consumed };
}

function isHyphenToken(token: Token | undefined): boolean {
  return (token?.type === "TEXT" && token.value === "-") || token?.type === "STRIKE_MARKER";
}
