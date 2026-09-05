import { findWhitespaceRunEnd } from "./runs";
import { isLineStartQuoteMarker } from "./state";
import type { TokenAction } from "./token-actions";
import type { Token } from "./tokens";

export function limitBlockquotePrefixSpace(
  action: TokenAction,
  previous: Token | undefined,
): TokenAction {
  if (!isLineStartQuoteMarker(previous) || action.type !== "WHITESPACE") {
    return action;
  }
  if (action.length <= 1 || !action.value.startsWith(" ")) {
    return action;
  }
  return { type: "WHITESPACE", value: " ", length: 1 };
}

export function scanSpacingToken(src: string, pos: number): TokenAction | null {
  const char = src[pos];

  if (char === "\n") {
    return token("NEWLINE", "\n");
  }

  if (char === " " || char === "\t") {
    return runToken(src, pos, findWhitespaceRunEnd(src, pos), "WHITESPACE");
  }

  return null;
}

function token(type: TokenAction["type"], value: string): TokenAction {
  return { type, value, length: value.length };
}

function runToken(src: string, pos: number, end: number, type: TokenAction["type"]): TokenAction {
  return { type, value: src.slice(pos, end), length: end - pos };
}
