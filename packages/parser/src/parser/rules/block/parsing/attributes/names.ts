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
  if (startName === "_" && isAttributeWordToken(ctx.tokens[startPos])) {
    startName += ctx.tokens[startPos]?.value ?? "";
    startPos++;
    startConsumed++;
  }

  return options.strikeHyphens
    ? consumeRawNameSuffix(ctx, startPos, startConsumed, startName, options.hyphenatedNames)
    : consumeSafeNameSuffix(ctx, startPos, startConsumed, startName);
}

export function isAttributeNameToken(token: Token | undefined): token is Token {
  return isAttributeWordToken(token) || token?.type === "UNDERSCORE";
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

  while (isAttributeNameSeparator(ctx.tokens[pos]) && isAttributeWordToken(ctx.tokens[pos + 1])) {
    name += ctx.tokens[pos]?.value ?? "";
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

  while (isAttributeNameSeparator(ctx.tokens[pos])) {
    while (isAttributeNameSeparator(ctx.tokens[pos])) {
      if (hyphenatedNames || ctx.tokens[pos]?.type === "UNDERSCORE") {
        name += ctx.tokens[pos]?.value ?? "-";
      }
      pos++;
      consumed++;
    }

    if (!isAttributeWordToken(ctx.tokens[pos])) {
      break;
    }

    if (hyphenatedNames || name.endsWith("_")) {
      name += ctx.tokens[pos]?.value ?? "";
    }
    pos++;
    consumed++;
  }

  return { name, pos, consumed };
}

function isAttributeWordToken(token: Token | undefined): boolean {
  return token?.type === "TEXT" || token?.type === "IDENTIFIER";
}

function isAttributeNameSeparator(token: Token | undefined): boolean {
  return (
    (token?.type === "TEXT" && token.value === "-") ||
    token?.type === "STRIKE_MARKER" ||
    token?.type === "UNDERSCORE"
  );
}
