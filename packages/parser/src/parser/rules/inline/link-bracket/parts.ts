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
  const end = Math.min(ctx.scope.inlineEnd ?? ctx.tokens.length, ctx.tokens.length);
  const values: string[] = [];
  while (pos < end) {
    const token = ctx.tokens[pos];
    if (
      !token ||
      token.type === "BRACKET_CLOSE" ||
      token.type === "NEWLINE" ||
      token.type === "EOF"
    )
      break;
    values.push(token.value);
    pos++;
  }
  if (pos >= end || ctx.tokens[pos]?.type !== "BRACKET_CLOSE") return null;
  // Compact TEXT tokens can contain both the target and the label separator.
  const content = values.join("");
  const separator = content.search(/[ \t]/);
  return {
    first: separator === -1 ? content : content.slice(0, separator),
    label: separator === -1 ? "" : content.slice(separator).trimStart(),
    consumed: pos - startPos + 1,
  };
}
