import type { ParseContext } from "../../types";

export function parseUserReference(
  ctx: ParseContext,
  startPos: number,
): { name: string; showAvatar: boolean; consumed: number } | null {
  let pos = startPos;
  let consumed = 0;

  if (ctx.tokens[pos]?.type === "WHITESPACE") {
    return null;
  }

  let showAvatar = false;
  if (ctx.tokens[pos]?.type === "STAR") {
    showAvatar = true;
    pos++;
    consumed++;
  }

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  const nameToken = ctx.tokens[pos];
  if (!nameToken || (nameToken.type !== "TEXT" && nameToken.type !== "IDENTIFIER")) {
    return null;
  }
  if (nameToken.value.toLowerCase() !== "user") {
    return null;
  }
  pos++;
  consumed++;

  while (ctx.tokens[pos]?.type === "WHITESPACE") {
    pos++;
    consumed++;
  }

  let username = "";
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
    username += token.value;
    pos++;
    consumed++;
  }

  username = username.trim();
  if (!username || ctx.tokens[pos]?.type !== "BLOCK_CLOSE") {
    return null;
  }

  return {
    name: username,
    showAvatar,
    consumed: consumed + 1,
  };
}
