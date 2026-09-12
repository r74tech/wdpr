import type { BlockRule, InlineRule, ParseContext } from "./types";
import { findCodeOpen } from "./block/code/open";
import { findCodeBodyBounds } from "./block/code/boundary";
import { findMathOpen, findMathBodyBounds } from "./block/math/boundary";

/** Probe opaque syntax without registering its code, footnotes or diagnostics. */
export function createOpaqueProbe(ctx: ParseContext): ParseContext {
  return {
    ...ctx,
    diagnostics: [],
    footnotes: [],
    tocEntries: [],
    codeBlocks: [],
    htmlBlocks: [],
    bibcites: [],
    scope: {
      ...ctx.scope,
      inlineEnd: undefined,
      tableFormatting: undefined,
      blockCloseCondition: () => true,
    },
  };
}

export function opaqueRuleEnd(
  probe: ParseContext,
  pos: number,
  rules: readonly (BlockRule | InlineRule)[],
  requireClosed: boolean = false,
): number {
  const token = probe.tokens[pos];
  if (!token) return pos;
  probe.pos = pos;
  for (const rule of rules) {
    if (!rule.startTokens.includes(token.type)) continue;
    if (rule.name === "code") {
      const open = findCodeOpen(probe.tokens, pos);
      if (!open) continue;
      if (open.closingSwallowed) {
        if (!requireClosed) return open.bodyStart;
        continue;
      }
      const bounds = findCodeBodyBounds(probe.tokens, open.bodyStart);
      if (!requireClosed || bounds.foundClose) return bounds.end;
      continue;
    }
    if (rule.name === "math") {
      const open = findMathOpen(probe.tokens, pos);
      if (!open) continue;
      const bounds = findMathBodyBounds(probe.tokens, open.bodyStart);
      if (bounds.hasContent && (!requireClosed || bounds.foundClose)) return bounds.end;
      continue;
    }
    const result = rule.parse(probe);
    if (result.success) return pos + result.consumed;
  }
  return pos;
}
