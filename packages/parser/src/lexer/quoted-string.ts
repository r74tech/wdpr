import { advance, current, isAtEnd, type LexerState } from "./state";

/**
 * Scan a quoted block-attribute value, including the opening quote and optional
 * closing quote. Newline terminates the token without being consumed.
 */
export function scanQuotedString(state: LexerState): string {
  let quoted = advance(state);
  while (!isAtEnd(state) && current(state) !== '"' && current(state) !== "\n") {
    quoted += advance(state);
  }
  if (current(state) === '"') {
    quoted += advance(state);
  }
  return quoted;
}
