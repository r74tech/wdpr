import { createOpaqueProbe, opaqueRuleEnd } from "../../opaque-probe";
import type { ParseContext } from "../../types";
import { codeBlockRule } from "../../block/code";
import { htmlBlockRule } from "../../block/html";
import { mathBlockRule } from "../../block/math";
import { mathInlineRule } from "../math-inline";
import { linkTripleRule } from "../link-triple";
import { linkSingleRule } from "../link-single";
import { linkStarRule } from "../link-star";
import { linkAnchorRule } from "../link-anchor";
import { protectedInlineRegionEnd } from "../raw/end";
import { tryConsumeFootnoteClose } from "./close";
import { parseFootnoteOpen } from "./open";

const opaqueRules = [
  codeBlockRule,
  htmlBlockRule,
  mathBlockRule,
  mathInlineRule,
  linkTripleRule,
  linkSingleRule,
  linkStarRule,
  linkAnchorRule,
];

/** Locate the enclosing close without parsing code, HTML or math as footnote syntax. */
export function findFootnoteEnd(ctx: ParseContext, start: number): number {
  const probe = createOpaqueProbe(ctx);
  let depth = 0;
  for (let pos = start; pos < ctx.tokens.length; pos++) {
    if (ctx.tokens[pos]?.type === "EOF") return pos;
    const protectedEnd = protectedInlineRegionEnd(ctx.tokens, pos, ctx.tokens.length);
    if (protectedEnd > pos) {
      pos = protectedEnd - 1;
      continue;
    }

    probe.pos = pos;
    const close = tryConsumeFootnoteClose(probe, pos);
    if (close) {
      if (depth === 0) return pos;
      depth--;
      pos += close.consumed - 1;
      continue;
    }
    const open = parseFootnoteOpen(probe);
    if (open) {
      depth++;
      pos += open.consumed - 1;
      continue;
    }
    const opaqueEnd = opaqueRuleEnd(probe, pos, opaqueRules);
    if (opaqueEnd > pos) pos = opaqueEnd - 1;
  }
  return ctx.tokens.length;
}

/**
 * Map each footnote opener to the end of its close in one pass, using the same
 * protected regions and nesting as {@link findFootnoteEnd}.
 */
export function matchFootnoteCloses(ctx: ParseContext): Map<number, number> {
  const probe = createOpaqueProbe(ctx);
  const matches = new Map<number, number>();
  const openers: number[] = [];
  for (let pos = 0; pos < ctx.tokens.length; pos++) {
    if (ctx.tokens[pos]?.type === "EOF") break;
    const protectedEnd = protectedInlineRegionEnd(ctx.tokens, pos, ctx.tokens.length);
    if (protectedEnd > pos) {
      pos = protectedEnd - 1;
      continue;
    }

    probe.pos = pos;
    const close = tryConsumeFootnoteClose(probe, pos);
    if (close) {
      const open = openers.pop();
      if (open !== undefined) matches.set(open, pos + close.consumed);
      pos += close.consumed - 1;
      continue;
    }
    const open = parseFootnoteOpen(probe);
    if (open) {
      openers.push(pos);
      pos += open.consumed - 1;
      continue;
    }
    const opaqueEnd = opaqueRuleEnd(probe, pos, opaqueRules);
    if (opaqueEnd > pos) pos = opaqueEnd - 1;
  }
  return matches;
}
