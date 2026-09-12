import type { Token } from "../../../../lexer";

const unclosedRanges = new WeakMap<readonly Token[], { start: number; end: number }>();

/** Raw directives end at the first ]], even inside a quoted value. */
export function findRawTagClose(
  tokens: readonly Token[],
  start: number,
  end: number,
): number | null {
  const unclosed = unclosedRanges.get(tokens);
  if (unclosed && start >= unclosed.start && end <= unclosed.end) return null;
  for (let close = start; close < end; close++) {
    if (tokens[close]?.type === "BLOCK_CLOSE") return close;
    if (!tokens[close] || tokens[close]?.type === "EOF") break;
  }
  unclosedRanges.set(tokens, { start, end });
  return null;
}
