/** Options for {@link decompile} and {@link htmlToAst}. */
export interface DecompileOptions {
  /** Whether to restore footnotes inline (default: `true`). */
  inlineFootnotes?: boolean;
}

/** Options for {@link serialize}. */
export interface SerializeOptions {
  /** Newline character(s) to use (default: `"\n"`). */
  newline?: string;
}
