import type { Element } from "@wdprlib/ast";
import type { TokenType } from "../../../lexer";
import type { ParseContext } from "./parse-context";

/**
 * Result of a rule attempt.
 */
export type RuleResult<T> = { success: true; elements: T[]; consumed: number } | { success: false };

/**
 * Block rule interface.
 */
export interface BlockRule {
  /** Rule name for debugging. */
  name: string;
  /** Token types that can start this rule. */
  startTokens: TokenType[];
  /** Whether this rule requires line start. */
  requiresLineStart: boolean;
  /** Try to parse this block. */
  parse(ctx: ParseContext): RuleResult<Element>;
  /**
   * Check if tokens at the given position match this rule's start pattern.
   * Used by inline parser to determine behavior before a block boundary.
   */
  isStartPattern?(ctx: ParseContext, pos: number): boolean;
  /**
   * When true, a single newline before this block becomes a line-break.
   */
  preservesPrecedingLineBreak?: boolean;
}

/**
 * Inline rule interface.
 */
export interface InlineRule {
  /** Rule name for debugging. */
  name: string;
  /** Token types that can start this rule. */
  startTokens: TokenType[];
  /** Try to parse this inline element. */
  parse(ctx: ParseContext): RuleResult<Element>;
}
