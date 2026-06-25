import type { ParseContext } from "../../types";

export function parseBibciteLabel(
  ctx: ParseContext,
  startPos: number,
): { label: string; consumed: number } | null {
  if (ctx.tokens[startPos]?.type !== "TEXT" || ctx.tokens[startPos]?.value !== "(") {
    return null;
  }
  if (ctx.tokens[startPos + 1]?.type !== "TEXT" || ctx.tokens[startPos + 1]?.value !== "(") {
    return null;
  }

  let pos = startPos + 2;
  let consumed = 2;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  const nameToken = ctx.tokens[pos];
  if (
    !nameToken ||
    nameToken.type !== "IDENTIFIER" ||
    nameToken.value.toLowerCase() !== "bibcite"
  ) {
    return null;
  }
  pos++;
  consumed++;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  const labelToken = ctx.tokens[pos];
  if (!labelToken || (labelToken.type !== "IDENTIFIER" && labelToken.type !== "TEXT")) {
    return null;
  }

  let label = "";
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "NEWLINE" || token.type === "EOF") {
      return null;
    }

    if (token.type === "TEXT" && token.value === ")") {
      const nextToken = ctx.tokens[pos + 1];
      if (nextToken?.type === "TEXT" && nextToken.value === ")") {
        const trimmed = label.trim();
        return trimmed ? { label: trimmed, consumed: consumed + 2 } : null;
      }
    }

    label += token.value;
    pos++;
    consumed++;
  }

  return null;
}
