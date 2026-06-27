import type { ParseContext } from "../../types";
import { hasClosingMarkerBeforeNewline } from "../../types";

export interface BracketLinkParts {
  first: string;
  label: string;
  consumed: number;
}

export function collectBracketLinkParts(
  ctx: ParseContext,
  startPos: number,
): BracketLinkParts | null {
  if (!hasClosingMarkerBeforeNewline({ ...ctx, pos: startPos }, "BRACKET_CLOSE")) {
    return null;
  }

  let pos = startPos;
  let consumed = 0;
  let first = "";

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (
      !token ||
      token.type === "WHITESPACE" ||
      token.type === "BRACKET_CLOSE" ||
      token.type === "NEWLINE" ||
      token.type === "EOF"
    ) {
      break;
    }
    first += token.value;
    pos++;
    consumed++;
  }

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  let label = "";
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (
      !token ||
      token.type === "BRACKET_CLOSE" ||
      token.type === "NEWLINE" ||
      token.type === "EOF"
    ) {
      break;
    }
    label += token.value;
    pos++;
    consumed++;
  }

  if (ctx.tokens[pos]?.type !== "BRACKET_CLOSE") {
    return null;
  }

  return { first, label, consumed: consumed + 1 };
}
