import type { Token } from "../../../../lexer";
import { rawRegionEnd } from "../../inline/raw/end";
import { findCodeOpen } from "./open";

interface CodeBodyBounds {
  closeStart: number;
  end: number;
  foundClose: boolean;
}

const caches = new WeakMap<readonly Token[], Map<number, CodeBodyBounds>>();

function codeCloseEnd(tokens: readonly Token[], start: number): number {
  if (tokens[start]?.type !== "BLOCK_END_OPEN" || tokens[start + 1]?.value.toLowerCase() !== "code")
    return start;
  let end = start + 2;
  while (tokens[end]?.type === "WHITESPACE") end++;
  return tokens[end]?.type === "BLOCK_CLOSE" ? end + 1 : start;
}

function nestedCodeBodyStart(tokens: readonly Token[], start: number): number {
  if (tokens[start]?.type !== "BLOCK_OPEN" || tokens[start + 1]?.value.toLowerCase() !== "code")
    return start;
  for (let pos = start + 2; pos < tokens.length; pos++) {
    const type = tokens[pos]?.type;
    if (type === "NEWLINE" || type === "EOF" || type === "BLOCK_OPEN") return start;
    if (type === "BLOCK_CLOSE") {
      const open = findCodeOpen(tokens, start);
      return open && !open.repaired ? open.bodyStart : start;
    }
  }
  return start;
}

export function findCodeBodyBounds(tokens: readonly Token[], start: number): CodeBodyBounds {
  let cache = caches.get(tokens);
  if (!cache) {
    cache = new Map();
    caches.set(tokens, cache);
  }
  const cached = cache.get(start);
  if (cached) return cached;
  const stack = [start];
  let pos = start;
  while (pos < tokens.length && tokens[pos]?.type !== "EOF") {
    const rawEnd = rawRegionEnd(tokens, pos, tokens.length);
    if (rawEnd > pos) {
      pos = rawEnd;
      continue;
    }
    const end = codeCloseEnd(tokens, pos);
    if (end > pos) {
      const result = { closeStart: pos, end, foundClose: true };
      cache.set(stack.pop()!, result);
      if (stack.length === 0) return result;
      pos = end;
      continue;
    }
    const bodyStart = nestedCodeBodyStart(tokens, pos);
    if (bodyStart > pos) {
      const child = cache.get(bodyStart);
      if (child) {
        pos = child.end;
        if (!child.foundClose) break;
      } else {
        stack.push(bodyStart);
        pos = bodyStart;
      }
      continue;
    }
    pos++;
  }
  const result = { closeStart: pos, end: pos, foundClose: false };
  for (const bodyStart of stack) cache.set(bodyStart, result);
  return result;
}
