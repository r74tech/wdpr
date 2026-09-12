import type { Token } from "../../../../lexer";

interface MathOpenBounds {
  nameStart: number;
  nameEnd: number;
  bodyStart: number;
}

interface MathBodyBounds {
  closeStart: number;
  end: number;
  foundClose: boolean;
  hasContent: boolean;
}

const nameRanges = new WeakMap<readonly Token[], { start: number; end: number }>();
const bodyCaches = new WeakMap<readonly Token[], Map<number, MathBodyBounds>>();

function findNameEnd(tokens: readonly Token[], start: number): number {
  const cached = nameRanges.get(tokens);
  if (cached && start >= cached.start && start <= cached.end) return cached.end;
  let end = start;
  while (end < tokens.length) {
    const type = tokens[end]?.type;
    if (type === "BLOCK_CLOSE" || type === "WHITESPACE" || type === "NEWLINE" || type === "EOF")
      break;
    end++;
  }
  nameRanges.set(tokens, { start, end });
  return end;
}

export function findMathOpen(tokens: readonly Token[], start: number): MathOpenBounds | null {
  const name = tokens[start + 1];
  if (
    tokens[start]?.type !== "BLOCK_OPEN" ||
    (name?.type !== "IDENTIFIER" && name?.type !== "TEXT") ||
    name.value.toLowerCase() !== "math" ||
    tokens[start + 2]?.type === "UNDERSCORE"
  )
    return null;
  let pos = start + 2;
  while (tokens[pos]?.type === "WHITESPACE") pos++;
  const nameStart = pos;
  if (tokens[pos]?.type === "IDENTIFIER" || tokens[pos]?.type === "TEXT") {
    pos = findNameEnd(tokens, pos);
  }
  const nameEnd = pos;
  while (tokens[pos]?.type === "WHITESPACE") pos++;
  if (tokens[pos]?.type !== "BLOCK_CLOSE") return null;
  pos++;
  if (tokens[pos]?.type === "NEWLINE") pos++;
  return { nameStart, nameEnd, bodyStart: pos };
}

function mathCloseEnd(tokens: readonly Token[], start: number): number {
  if (
    tokens[start]?.type !== "BLOCK_END_OPEN" ||
    tokens[start + 1]?.value.toLowerCase() !== "math" ||
    tokens[start + 2]?.type !== "BLOCK_CLOSE"
  )
    return start;
  const end = start + 3;
  return tokens[end]?.type === "NEWLINE" ? end + 1 : end;
}

export function findMathBodyBounds(tokens: readonly Token[], start: number): MathBodyBounds {
  let cache = bodyCaches.get(tokens);
  if (!cache) {
    cache = new Map();
    bodyCaches.set(tokens, cache);
  }
  const visited: number[] = [];
  let result: MathBodyBounds = {
    closeStart: tokens.length,
    end: tokens.length,
    foundClose: false,
    hasContent: false,
  };
  for (let pos = start; pos < tokens.length; pos++) {
    const cached = cache.get(pos);
    if (cached) {
      result = cached;
      break;
    }
    const end = mathCloseEnd(tokens, pos);
    if (end > pos) {
      result = { closeStart: pos, end, foundClose: true, hasContent: false };
      cache.set(pos, result);
      break;
    }
    visited.push(pos);
  }
  // Empty-body detection must also be reusable without joining each candidate's suffix.
  for (let i = visited.length - 1; i >= 0; i--) {
    const pos = visited[i]!;
    const token = tokens[pos]!;
    if (!result.hasContent && (token.type === "BACKSLASH_BREAK" || token.value.trim() !== "")) {
      result = { ...result, hasContent: true };
    }
    cache.set(pos, result);
  }
  return result;
}
