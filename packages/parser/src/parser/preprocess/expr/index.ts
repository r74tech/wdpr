/**
 *
 * Text-level expansion of `[[#if ...]]`, `[[#ifexpr ...]]`, and
 * `[[#expr ...]]` directives that sit *inside* another block's opener.
 *
 * @module
 */

import { makeUniqueSentinels, maskRawRegions, restorePlaceholders } from "../utils";
import { expandInnermost } from "./scan";

/**
 * Resolve every `[[#if]]` / `[[#ifexpr]]` / `[[#expr]]` that sits inside
 * another block's opener (depth > 0). Top-level directives are left for
 * the inline parser. Innermost-first reduction lets an outer directive
 * re-process the flattened body on the next pass. Unmatched / malformed
 * directives are left untouched.
 */
export function preprocessExpr(source: string): string {
  if (!source.includes("[[#")) return source;

  const sentinels = makeUniqueSentinels(source);
  const { masked, placeholders } = maskRawRegions(source, sentinels);
  const reduced = reduceExpr(masked);
  return restorePlaceholders(reduced, placeholders, sentinels);
}

/**
 * Backwards-compatible alias for the older `preprocessIf` name (used by
 * external callers that target the previous, `[[#if]]`-only behaviour).
 * Both names point at the same implementation, which now also resolves
 * `[[#ifexpr]]` and `[[#expr]]` in opener context.
 */
export const preprocessIf: (source: string) => string = preprocessExpr;

function reduceExpr(source: string): string {
  let current = source;
  const maxIterations = source.length + 1;
  for (let i = 0; i < maxIterations; i++) {
    const next = expandInnermost(current);
    if (next === current) return current;
    current = next;
  }
  return current;
}
