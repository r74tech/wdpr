import type { Token, TokenType } from "../../../../lexer";
import { isLocalChar, scanEmail } from "./scan";

export interface EmailCandidate {
  start: number;
  end: number;
  endToken: number;
  address: string;
}

interface EmailCache {
  source: string;
  offsets: number[];
  candidates: Map<number, EmailCandidate | null>;
  commentEnds: Map<number, number>;
  unclosedComment: number;
}

const caches = new WeakMap<readonly Token[], EmailCache>();
export const EMAIL_START_TOKENS: TokenType[] = [
  "TEXT",
  "IDENTIFIER",
  "UNDERSCORE",
  "UNDERLINE_MARKER",
  "STRIKE_MARKER",
];

function getCache(tokens: readonly Token[]): EmailCache {
  let cache = caches.get(tokens);
  if (cache) return cache;
  const offsets = [0];
  const values: string[] = [];
  for (const token of tokens) {
    values.push(token.value);
    offsets.push(offsets.at(-1)! + token.value.length);
  }
  cache = {
    source: values.join(""),
    offsets,
    candidates: new Map(),
    commentEnds: new Map(),
    unclosedComment: Infinity,
  };
  caches.set(tokens, cache);
  return cache;
}

function commentEnd(cache: EmailCache, pos: number): number {
  const opener = cache.source[pos] === "\n" ? pos + 1 : pos;
  if (!cache.source.startsWith("[!--", opener)) return pos;
  const cached = cache.commentEnds.get(pos);
  if (cached !== undefined) return cached;
  const close = opener >= cache.unclosedComment ? -1 : cache.source.indexOf("--]", opener + 4);
  if (close === -1) cache.unclosedComment = Math.min(cache.unclosedComment, opener);
  const end = close === -1 ? pos : close + 3;
  cache.commentEnds.set(pos, end);
  return end;
}

export function getEmailCandidate(tokens: readonly Token[], index: number): EmailCandidate | null {
  const token = tokens[index];
  if (!token || !EMAIL_START_TOKENS.includes(token.type)) return null;
  const cache = getCache(tokens);
  if (cache.candidates.has(index)) return cache.candidates.get(index)!;
  const value = tokens[index]?.value ?? "";
  // Compact TEXT may include a prefix before the last possible local-part run.
  let suffix = value.length;
  while (suffix > 0 && (isLocalChar(value.charCodeAt(suffix - 1)) || value[suffix - 1] === "."))
    suffix--;
  const doubled = value.lastIndexOf("..");
  if (doubled >= suffix) suffix = doubled + 2;
  while (value[suffix] === ".") suffix++;
  if (suffix >= value.length || !isLocalChar(value.charCodeAt(suffix))) {
    cache.candidates.set(index, null);
    return null;
  }
  const start = cache.offsets[index]! + suffix;
  const scanned = scanEmail(cache.source, start, (pos) => commentEnd(cache, pos));
  if (scanned.end === undefined) {
    cache.candidates.set(index, null);
    let comment = 0;
    // A failed local run cannot produce an address from one of its suffix tokens.
    // Do not poison positions inside skipped comments: another parse scope may see them as raw text.
    for (let i = index + 1; i < tokens.length && cache.offsets[i + 1]! <= scanned.localEnd; i++) {
      const offset = cache.offsets[i]!;
      while (scanned.comments[comment] && scanned.comments[comment]!.end <= offset) comment++;
      const region = scanned.comments[comment];
      if (!region || offset < region.start) cache.candidates.set(i, null);
    }
    return null;
  }
  let endToken = index;
  while (cache.offsets[endToken + 1]! < scanned.end) endToken++;
  const candidate = { start, end: scanned.end, endToken, address: scanned.address! };
  cache.candidates.set(index, candidate);
  return candidate;
}

interface EmailGroup {
  candidates: EmailCandidate[];
  source: string;
  start: number;
  end: number;
  endToken: number;
}

export function getEmailGroup(
  tokens: readonly Token[],
  index: number,
  limit: number,
): EmailGroup | null {
  const first = getEmailCandidate(tokens, index);
  if (!first || first.endToken >= limit) return null;
  const candidates = [first];
  let last = first;
  while (last.endToken > index) {
    const next = getEmailCandidate(tokens, last.endToken);
    if (!next || next.start < last.end || next.endToken >= limit) break;
    candidates.push(next);
    last = next;
  }
  const cache = getCache(tokens);
  return {
    candidates,
    source: cache.source,
    start: cache.offsets[index]!,
    end: cache.offsets[last.endToken + 1]!,
    endToken: last.endToken + 1,
  };
}

export function emailRegionEnd(tokens: readonly Token[], index: number, limit: number): number {
  return getEmailGroup(tokens, index, limit)?.endToken ?? index;
}
