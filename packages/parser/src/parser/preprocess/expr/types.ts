export type DirectiveKind = "if" | "ifexpr" | "expr";

export interface DirectiveMatch {
  /** Position just past the closing `]]`. */
  end: number;
  /** Raw condition / expression. */
  head: string;
  /** Raw `then` branch. */
  thenText: string;
  /** Raw `else` branch. */
  elseText: string;
  /** Whether the directive supplied a `|` at all. */
  hasPipe: boolean;
}
