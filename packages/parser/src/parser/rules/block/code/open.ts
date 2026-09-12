import type { Token } from "../../../../lexer";

interface CodeOpenBounds {
  attributesEnd: number;
  bodyStart: number;
  repaired: boolean;
  closingSwallowed: boolean;
}

const attributeRanges = new WeakMap<readonly Token[], { start: number; end: number }>();

function findAttributesEnd(tokens: readonly Token[], start: number): number {
  const cached = attributeRanges.get(tokens);
  if (cached && start >= cached.start && start <= cached.end) return cached.end;
  let end = start;
  while (end < tokens.length) {
    const type = tokens[end]?.type;
    if (type === "BLOCK_CLOSE" || type === "NEWLINE" || type === "EOF") break;
    end++;
  }
  attributeRanges.set(tokens, { start, end });
  return end;
}

export function findCodeOpen(tokens: readonly Token[], start: number): CodeOpenBounds | null {
  const name = tokens[start + 1];
  if (
    tokens[start]?.type !== "BLOCK_OPEN" ||
    (name?.type !== "IDENTIFIER" && name?.type !== "TEXT") ||
    name.value.toLowerCase() !== "code" ||
    tokens[start + 2]?.type === "UNDERSCORE"
  )
    return null;
  const attributesEnd = findAttributesEnd(tokens, start + 2);
  const repaired = tokens[attributesEnd]?.type !== "BLOCK_CLOSE";
  const last = tokens[attributesEnd - 1];
  if (repaired && (last?.type !== "QUOTED_STRING" || !last.value.includes("]]"))) return null;
  let bodyStart = attributesEnd + (repaired ? 0 : 1);
  if (tokens[bodyStart]?.type === "NEWLINE") bodyStart++;
  return {
    attributesEnd,
    bodyStart,
    repaired,
    closingSwallowed: repaired && last!.value.includes("[[/code]]"),
  };
}
