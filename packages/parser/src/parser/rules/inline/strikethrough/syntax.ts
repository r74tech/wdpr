import type { ParseContext } from "../../types";

/**
 * Returns true when the current `--` can be parsed as strikethrough.
 */
export function hasValidStrikethroughClose(ctx: ParseContext): boolean {
  let pos = ctx.pos + 1;
  let prevWasWhitespace = false;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "NEWLINE" || token.type === "EOF") {
      return false;
    }

    if (token.type === "STRIKE_MARKER") {
      return pos > ctx.pos + 1 && !prevWasWhitespace;
    }

    prevWasWhitespace = token.type === "WHITESPACE";
    pos++;
  }
  return false;
}
