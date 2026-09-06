import type { Token } from "../../../../lexer";

/** Exclusive end of a complete single-line raw region, or the original position. */
export function rawRegionEnd(tokens: readonly Token[], start: number, end: number): number {
  const type = tokens[start]?.type;
  const close =
    type === "RAW_OPEN" ? "RAW_OPEN" : type === "RAW_BLOCK_OPEN" ? "RAW_BLOCK_CLOSE" : null;
  if (!close) return start;
  for (let pos = start + 1; pos < end; pos++) {
    if (tokens[pos]?.type === "NEWLINE" || tokens[pos]?.type === "EOF") break;
    if (tokens[pos]?.type === close) return pos + 1;
  }
  return start;
}

/** Raw text and complete comments shield delimiters from their enclosing rule. */
export function protectedInlineRegionEnd(
  tokens: readonly Token[],
  start: number,
  end: number,
): number {
  const rawEnd = rawRegionEnd(tokens, start, end);
  if (rawEnd > start || tokens[start]?.type !== "COMMENT_OPEN") return rawEnd;
  for (let pos = start + 1; pos < end; pos++) {
    if (tokens[pos]?.type === "COMMENT_CLOSE") return pos + 1;
  }
  return start;
}
