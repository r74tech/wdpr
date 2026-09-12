import type { ParseContext } from "./parse-context";

/**
 * Per-scope state propagated by spread + override semantics.
 *
 * Every field is `readonly` so a rule cannot accidentally mutate the
 * parent scope by writing through a shared reference. Updates must be
 * expressed as a replacement: `ctx.scope = { ...ctx.scope, X: ... }`.
 */
export interface ScopeContext {
  /** Exclusive token boundary inherited by nested inline rules. */
  readonly inlineEnd?: number;
  /** Keep bare addresses as text inside an existing anchor. */
  readonly suppressEmailLinks?: boolean;
  /** Closing delimiters paired across cells of the current pipe table. */
  readonly tableFormatting?: { end: number; suppressedClosers: Set<number> };
  /**
   * Close condition for the current block. The paragraph parser calls
   * it to decide when to stop collecting inline content.
   */
  readonly blockCloseCondition?: (ctx: ParseContext) => boolean;
  /**
   * Block names excluded from paragraph-boundary detection.
   */
  readonly excludedBlockNames?: ReadonlySet<string>;
  /**
   * Budget for div nesting: tracks how many more nested divs can open.
   */
  readonly divClosesBudget?: number;
  /**
   * Used by the footnote-block rule to reject duplicate top-level occurrences.
   *
   * Scope is per spread copy of `ParseContext`, not document-global. This keeps
   * the original primitive semantics while avoiding rollback-unsafe shared state.
   */
  readonly footnoteBlockParsed: boolean;
}
