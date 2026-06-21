import type { ParseContext } from "../../types";

const divCloseCountCache = new WeakMap<ParseContext["tokens"], Uint32Array>();

/**
 * Counts `[[/div]]` close tags from a given position to the end of the
 * token stream. Used to calculate the nesting budget for div blocks.
 */
export function countDivCloses(ctx: ParseContext, startPos: number): number {
  let counts = divCloseCountCache.get(ctx.tokens);
  if (!counts) {
    counts = new Uint32Array(ctx.tokens.length + 1);
    for (let i = ctx.tokens.length - 1; i >= 0; i--) {
      let count = counts[i + 1]!;
      if (isDivCloseToken(ctx, i)) {
        count++;
      }
      counts[i] = count;
    }
    divCloseCountCache.set(ctx.tokens, counts);
  }
  return counts[startPos] ?? 0;
}

function isDivCloseToken(ctx: ParseContext, pos: number): boolean {
  if (ctx.tokens[pos]?.type !== "BLOCK_END_OPEN") return false;
  const name = ctx.tokens[pos + 1];
  if (!name || (name.type !== "TEXT" && name.type !== "IDENTIFIER")) return false;
  if (name.value.length !== 3) return false;
  const d = name.value.charCodeAt(0);
  const i = name.value.charCodeAt(1);
  const v = name.value.charCodeAt(2);
  if (
    !((d === 100 || d === 68) && (i === 105 || i === 73) && (v === 118 || v === 86))
  ) {
    return false;
  }
  return ctx.tokens[pos + 2]?.type !== "UNDERSCORE";
}
