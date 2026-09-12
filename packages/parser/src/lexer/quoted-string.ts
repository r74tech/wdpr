import { advance, current, type LexerState } from "./state";

/**
 * Scan a quoted block-attribute value, including the opening quote and optional
 * closing quote. Newline terminates the token without being consumed.
 */
export function scanQuotedString(state: LexerState, end: number = state.source.length): string {
  let quoted = advance(state);
  while (state.pos < end && current(state) !== '"' && current(state) !== "\n") {
    quoted += advance(state);
  }
  if (state.pos < end && current(state) === '"') {
    quoted += advance(state);
  }
  return quoted;
}
