/** Language definition for Text_Highlighter-compatible highlighting */
export interface LanguageDefinition {
  /** Language name */
  language: string;
  /** Default CSS class for unmatched text */
  defClass: string;
  /** Regex patterns per state: state → combined regex (null = no pattern for this state) */
  regs: Record<number, RegExp | null>;
  /** Number of capture groups per pattern per state */
  counts: Record<number, number[]>;
  /** Delimiter classes per state per pattern */
  delim: Record<number, string[]>;
  /** Inner (token) classes per state per pattern */
  inner: Record<number, string[]>;
  /** End patterns per state (regex that ends the state, null = no end pattern) */
  end: Record<number, RegExp | null>;
  /** State transitions: state → pattern_index → next_state (-1 = no transition) */
  states: Record<number, number[]>;
  /** Keywords: state → pattern_index → {group_name: regex} */
  keywords: Record<number, (Record<string, RegExp> | -1)[]>;
  /** Keyword group → CSS class mapping */
  kwmap: Record<string, string>;
  /** Parts: state → pattern_index → {subgroup: class} | null */
  parts: Record<number, (Record<number, string> | null)[]>;
  /** Substitution flags */
  subst: Record<number, boolean[]>;
}
