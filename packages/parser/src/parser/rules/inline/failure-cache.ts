/**
 * Shared memo for inline rules that fail when their closing tag is missing.
 *
 * Such a rule parses its whole body before it can fail, and every enclosing
 * rule that fails retries the inner ones. Without a memo, n nested unclosed
 * openers are parsed 2^n - 1 times at only n distinct positions.
 *
 * @module
 */

import type { ParseContext } from "../types";

const scopeRefIds = new WeakMap<object, number>();
let nextScopeRefId = 1;

function refId(value: object | undefined): number {
  if (value === undefined) return 0;
  let id = scopeRefIds.get(value);
  if (id === undefined) {
    id = nextScopeRefId++;
    scopeRefIds.set(value, id);
  }
  return id;
}

export class InlineFailureCache {
  private readonly failures = new WeakMap<ParseContext["tokens"], Set<string>>();

  /**
   * Null when the scope carries mutable table state, which makes failures non-repeatable.
   * Settings and version are included because callers may parse one token array more than once.
   */
  key(ctx: ParseContext): string | null {
    const scope = ctx.scope;
    if (scope.tableFormatting) return null;
    return [
      refId(ctx.settings),
      ctx.version,
      ctx.pos,
      scope.inlineEnd ?? -1,
      scope.suppressEmailLinks === true ? 1 : 0,
      refId(scope.blockCloseCondition),
      refId(scope.excludedBlockNames),
      scope.divClosesBudget ?? -1,
      scope.footnoteBlockParsed ? 1 : 0,
      scope.footnoteDepth ?? 0,
    ].join(":");
  }

  has(ctx: ParseContext, key: string | null): boolean {
    return key !== null && (this.failures.get(ctx.tokens)?.has(key) ?? false);
  }

  /** Looks the set up again because parsing the body may have created it. */
  add(ctx: ParseContext, key: string | null): void {
    if (key === null) return;
    const failed = this.failures.get(ctx.tokens);
    if (failed) failed.add(key);
    else this.failures.set(ctx.tokens, new Set([key]));
  }
}
