import type { ParseContext } from "../types";

/**
 * Parse block name from tokens (handles [[name or [[/name).
 *
 * Handles underscore suffix like "div_" which may be tokenized as
 * [IDENTIFIER "div"] [UNDERSCORE "_"].
 */
export function parseBlockName(
  ctx: ParseContext,
  startPos: number,
): { name: string; consumed: number } | null {
  let pos = startPos;
  let consumed = 0;

  // Wikidot does NOT allow whitespace between [[ and block name.
  // e.g. [[ code ]] is treated as plain text, not a code block.
  const token = ctx.tokens[pos];
  if (!token || (token.type !== "TEXT" && token.type !== "IDENTIFIER")) {
    return null;
  }

  let name = token.value.toLowerCase();
  consumed++;
  pos++;

  if (ctx.tokens[pos]?.type === "UNDERSCORE") {
    name += "_";
    consumed++;
  }

  return { name, consumed };
}
