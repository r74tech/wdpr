import type { ParseContext } from "../../types";

const VALID_SIZE_UNITS = ["px", "em", "rem", "ex", "%", "cm", "mm", "in", "pc"];

export function parseSizeValue(
  ctx: ParseContext,
  startPos: number,
): { size: string; consumed: number } | null {
  let pos = startPos;
  let consumed = 0;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  const parts: string[] = [];
  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (
      !token ||
      token.type === "BLOCK_CLOSE" ||
      token.type === "NEWLINE" ||
      token.type === "EOF" ||
      token.type === "WHITESPACE"
    ) {
      break;
    }
    parts.push(token.value);
    pos++;
    consumed++;
  }

  if (parts.length === 0) {
    return null;
  }

  const size = parts.join("");
  return isValidSizeValue(size) ? { size, consumed } : null;
}

function isValidSizeValue(size: string): boolean {
  const unitPattern = VALID_SIZE_UNITS.join("|");
  return new RegExp(`^(\\d+(?:\\.\\d+)?)(${unitPattern})$`, "i").test(size);
}
