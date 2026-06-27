import type { ParseContext } from "../../types";

export function parseInlineMathSource(
  ctx: ParseContext,
  startPos: number,
): { latexSource: string; consumed: number } | null {
  let pos = startPos;
  let consumed = 0;

  if (ctx.tokens[pos]?.type !== "TEXT" || ctx.tokens[pos]?.value !== "$") {
    return null;
  }
  pos++;
  consumed++;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  let latexSource = "";
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "NEWLINE") {
      return null;
    }

    if (
      token.type === "TEXT" &&
      token.value === "$" &&
      ctx.tokens[pos + 1]?.type === "BLOCK_CLOSE"
    ) {
      break;
    }

    latexSource += token.value;
    pos++;
    consumed++;
  }

  if (ctx.tokens[pos]?.type !== "TEXT" || ctx.tokens[pos]?.value !== "$") {
    return null;
  }
  pos++;
  consumed++;

  if (ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }

  return {
    latexSource: latexSource.trim(),
    consumed: consumed + 1,
  };
}
