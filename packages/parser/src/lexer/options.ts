/**
 * Configuration for the {@link Lexer}.
 *
 * @group Lexer
 */
export interface LexerOptions {
  /**
   * When `true` (default), every token carries accurate line/column/offset
   * data. Set to `false` to skip position tracking for faster tokenisation
   * when source-map information is not needed.
   */
  trackPositions?: boolean;
  /**
   * Coalesce ordinary text outside `[[...]]` openers into larger TEXT tokens.
   * This keeps block names and attributes tokenized normally while reducing
   * token volume for large documents.
   */
  compactTextRuns?: boolean;
}
