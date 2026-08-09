/**
 *
 * Text-level expansion of `[[#if ...]]`, `[[#ifexpr ...]]`, and
 * `[[#expr ...]]` directives that sit *inside* another block's opener.
 *
 * @module
 */

import { makeUniqueSentinels, maskRawRegions, restorePlaceholders } from "../utils";
import { matchDirectiveKind } from "./kind";
import { expandInnermost } from "./scan";

const MAX_EXPR_NESTING = 64;

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
  if (exceedsExprNestingLimit(masked)) return source;
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

function exceedsExprNestingLimit(source: string): boolean {
  const expressionStack: boolean[] = [];
  let expressionDepth = 0;

  for (let i = 0; i < source.length; i++) {
    if (source.startsWith("[[", i)) {
      const isExpression = matchDirectiveKind(source, i) !== null;
      expressionStack.push(isExpression);
      if (isExpression && ++expressionDepth > MAX_EXPR_NESTING) return true;
      i++;
      continue;
    }

    if (source.startsWith("]]", i)) {
      if (expressionStack.pop()) expressionDepth--;
      i++;
    }
  }

  return false;
}
