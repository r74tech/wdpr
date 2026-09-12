import type { Token } from "../../../../lexer";
import type { ParseContext } from "../../types";
import { createOpaqueProbe, opaqueRuleEnd } from "../../opaque-probe";
import { codeBlockRule } from "../code";
import { mathBlockRule } from "../math";
import { linkTripleRule } from "../../inline/link-triple";
import { protectedInlineRegionEnd } from "../../inline/raw/end";

// These constructs are replaced before Note in Wikidot's processing order.
const opaqueRules = [codeBlockRule, mathBlockRule, linkTripleRule];
interface NoteBounds {
  bodyStart: number;
  close: number;
  end: number;
}
const boundsCache = new WeakMap<readonly Token[], Map<number, NoteBounds | null>>();
const closeCache = new WeakMap<readonly Token[], Map<string, Map<number, number>>>();

function tagEnd(tokens: readonly Token[], pos: number, name: string, close = false): number {
  return tokens[pos]?.type === (close ? "BLOCK_END_OPEN" : "BLOCK_OPEN") &&
    tokens[pos + 1]?.value.toLowerCase() === name &&
    tokens[pos + 2]?.type === "BLOCK_CLOSE"
    ? pos + 3
    : pos;
}

function findClose(probe: ParseContext, start: number, name: string): number {
  let byName = closeCache.get(probe.tokens);
  if (!byName) {
    byName = new Map();
    closeCache.set(probe.tokens, byName);
  }
  let cache = byName.get(name);
  if (!cache) {
    cache = new Map();
    byName.set(name, cache);
  }
  if (cache.has(start)) return cache.get(start)!;
  const visited: number[] = [];
  let result = -1;
  for (let pos = start; pos < probe.tokens.length; pos++) {
    if (cache.has(pos)) {
      result = cache.get(pos)!;
      break;
    }
    visited.push(pos);
    const protectedEnd = protectedInlineRegionEnd(probe.tokens, pos, probe.tokens.length);
    if (protectedEnd > pos) {
      pos = protectedEnd - 1;
      continue;
    }
    if (tagEnd(probe.tokens, pos, name, true) > pos) {
      result = pos;
      break;
    }
    const opaqueEnd = opaqueRuleEnd(probe, pos, opaqueRules, true);
    if (opaqueEnd > pos) {
      pos = opaqueEnd - 1;
      continue;
    }
    // Footnote precedes Note and uses its first complete close, without nesting.
    if (name === "note") {
      const footnoteStart = tagEnd(probe.tokens, pos, "footnote");
      if (footnoteStart > pos) {
        const end = findClose(probe, footnoteStart, "footnote");
        if (end >= 0) pos = end + 2;
      }
    }
  }
  // Only visited positions are reusable: opaque interiors have different boundaries.
  for (const pos of visited) cache.set(pos, result);
  return result;
}

export function findNoteBounds(ctx: ParseContext, start: number = ctx.pos): NoteBounds | null {
  const openEnd = tagEnd(ctx.tokens, start, "note");
  if (openEnd === start || ctx.tokens[openEnd]?.type !== "NEWLINE") return null;
  let cache = boundsCache.get(ctx.tokens);
  if (!cache) {
    cache = new Map();
    boundsCache.set(ctx.tokens, cache);
  }
  if (cache.has(start)) return cache.get(start)!;
  const close = findClose(createOpaqueProbe(ctx), openEnd + 1, "note");
  const result = close < 0 ? null : { bodyStart: openEnd + 1, close, end: close + 3 };
  cache.set(start, result);
  return result;
}
