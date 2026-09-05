import type { Token } from "./tokens";
import type { TokenType } from "./tokens";

/**
 * Internal mutable state carried through a single tokenisation pass.
 */
export interface LexerState {
  source: string;
  pos: number;
  line: number;
  column: number;
  lineStart: boolean;
  quoteContentStart: boolean;
  tokens: Token[];
}

export function createInitialLexerState(source: string): LexerState {
  return {
    source,
    pos: 0,
    line: 1,
    column: 1,
    lineStart: true,
    quoteContentStart: false,
    tokens: [],
  };
}

export function isSyntaxLineStart(state: LexerState): boolean {
  return state.lineStart || state.quoteContentStart;
}

export function isAtEnd(state: LexerState): boolean {
  return state.pos >= state.source.length;
}

export function current(state: LexerState): string {
  return state.source[state.pos] ?? "";
}

export function advance(state: LexerState, n = 1): string {
  const start = state.pos;
  const end = Math.min(state.pos + n, state.source.length);
  const value = state.source.slice(start, end);
  updatePosition(state, start, end);
  return value;
}

export function advanceBy(state: LexerState, n = 1): void {
  const start = state.pos;
  const end = Math.min(state.pos + n, state.source.length);
  updatePosition(state, start, end);
}

export function advanceByToken(
  state: LexerState,
  type: TokenType,
  length: number,
  value = "",
): void {
  const afterQuoteMarker = state.tokens[state.tokens.length - 1]?.type === "BLOCKQUOTE_MARKER";
  state.pos += length;

  if (type === "NEWLINE") {
    state.line++;
    state.column = 1;
    state.lineStart = true;
    state.quoteContentStart = false;
    return;
  }

  state.column += length;
  if (type === "WHITESPACE") {
    if (afterQuoteMarker && value === " ") {
      state.quoteContentStart = true;
    }
    return;
  }

  state.lineStart = false;
  state.quoteContentStart = false;
}

function updatePosition(state: LexerState, start: number, end: number): void {
  state.pos = end;
  updatePositionFromValue(state, state.source.slice(start, end));
}

function updatePositionFromValue(state: LexerState, value: string): void {
  const firstNewline = value.indexOf("\n");
  if (firstNewline === -1) {
    state.column += value.length;
    if (state.lineStart && hasNonLineStartSpacing(value, 0)) {
      state.lineStart = false;
    }
    return;
  }

  const lastNewline = value.lastIndexOf("\n");
  let newlineCount = 1;
  let searchFrom = firstNewline + 1;
  while (searchFrom <= lastNewline) {
    const nextNewline = value.indexOf("\n", searchFrom);
    if (nextNewline === -1) break;
    newlineCount++;
    searchFrom = nextNewline + 1;
  }

  state.line += newlineCount;
  state.column = value.length - lastNewline;
  state.lineStart = !hasNonLineStartSpacing(value, lastNewline + 1);
}

function hasNonLineStartSpacing(value: string, start: number): boolean {
  for (let i = start; i < value.length; i++) {
    const char = value[i];
    if (char !== " " && char !== "\t") {
      return true;
    }
  }
  return false;
}
