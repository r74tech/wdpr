import type { Token } from "../../../../lexer";
import type { ParseContext } from "../../types";

/**
 * Collect tokens until newline or EOF.
 */
export function collectUntilNewline(ctx: ParseContext): { tokens: Token[]; consumed: number } {
  const tokens: Token[] = [];
  let consumed = 0;
  let pos = ctx.pos;

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "NEWLINE" || token.type === "EOF") {
      break;
    }
    tokens.push(token);
    consumed++;
    pos++;
  }

  return { tokens, consumed };
}
