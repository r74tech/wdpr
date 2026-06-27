import type { ParseContext } from "../../types";

export function collectAnchorName(
  ctx: ParseContext,
  startPos: number,
): { name: string; consumed: number } | null {
  let pos = startPos;
  let consumed = 0;
  let name = "";

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (
      !token ||
      token.type === "BLOCK_CLOSE" ||
      token.type === "NEWLINE" ||
      token.type === "EOF"
    ) {
      break;
    }
    if (!isValidAnchorNameToken(token.value)) {
      break;
    }
    name += token.value;
    pos++;
    consumed++;
  }

  return name ? { name, consumed } : null;
}

function isValidAnchorNameToken(value: string): boolean {
  for (const char of value) {
    if (!/^[-_A-Za-z0-9.%]$/.test(char)) {
      return false;
    }
  }
  return true;
}
