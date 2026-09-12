import type { Token } from "../../../../lexer";

// A failed angle-raw search also rules out later openers within the same immutable token range.
const unclosedAngleRanges = new WeakMap<
  readonly Token[],
  { start: number; end: number; lineEnd: boolean }
>();

/** Exclusive end of a complete single-line raw region, or the original position. */
export function rawRegionEnd(tokens: readonly Token[], start: number, end: number): number {
  const type = tokens[start]?.type;
  const close =
    type === "RAW_OPEN" ? "RAW_OPEN" : type === "RAW_BLOCK_OPEN" ? "RAW_BLOCK_CLOSE" : null;
  if (!close) return start;
  const cached = type === "RAW_BLOCK_OPEN" ? unclosedAngleRanges.get(tokens) : undefined;
  if (
    cached &&
    start >= cached.start &&
    start < cached.end &&
    (cached.lineEnd || end <= cached.end)
  ) {
    return start;
  }
  for (let pos = start + 1; pos < end; pos++) {
    if (tokens[pos]?.type === "NEWLINE" || tokens[pos]?.type === "EOF") {
      if (type === "RAW_BLOCK_OPEN")
        unclosedAngleRanges.set(tokens, { start, end: pos, lineEnd: true });
      return start;
    }
    if (tokens[pos]?.type === close) return pos + 1;
  }
  if (type === "RAW_BLOCK_OPEN") unclosedAngleRanges.set(tokens, { start, end, lineEnd: false });
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
