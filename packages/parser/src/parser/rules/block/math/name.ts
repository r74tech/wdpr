import type { ParseContext } from "../../types";

export interface MathNameResult {
  name: string | null;
  consumed: number;
}

export function parseMathName(ctx: ParseContext, startPos: number): MathNameResult {
  let pos = startPos;
  let consumed = 0;
  let name = "";

  const first = ctx.tokens[pos];
  if (first?.type !== "IDENTIFIER" && first?.type !== "TEXT") {
    return { name: null, consumed: 0 };
  }

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (
      !token ||
      token.type === "BLOCK_CLOSE" ||
      token.type === "WHITESPACE" ||
      token.type === "NEWLINE"
    ) {
      break;
    }

    name += token.value;
    pos++;
    consumed++;
  }

  return { name: name === "" ? null : name, consumed };
}
