import type { Position } from "@wdprlib/ast";
import type { LexerState } from "./state";
import type { Token, TokenType } from "./tokens";

const ZERO_POSITION: Position = {
  start: { line: 0, column: 0, offset: 0 },
  end: { line: 0, column: 0, offset: 0 },
};

export function createLexerToken(
  state: LexerState,
  type: TokenType,
  value: string,
  trackPositions: boolean,
): Token {
  return {
    type,
    value,
    position: trackPositions ? currentTokenPosition(state, value) : ZERO_POSITION,
    lineStart: isTokenAtLineStart(state),
  };
}

export function updateLastNonWhitespaceType(
  current: TokenType | null,
  type: TokenType,
): TokenType | null {
  return type === "WHITESPACE" ? current : type;
}

/**
 * Track block-opener nesting so `"` after `=` is only recognised as a quoted
 * attribute value while inside `[[ ... ]]`.
 */
export function nextBlockOpenerDepth(current: number, type: TokenType): number {
  if (type === "BLOCK_OPEN" || type === "BLOCK_END_OPEN") {
    return current + 1;
  }
  if (type === "BLOCK_CLOSE" && current > 0) {
    return current - 1;
  }
  return current;
}

function currentTokenPosition(state: LexerState, value: string): Position {
  return {
    start: {
      line: state.line,
      column: state.column - value.length,
      offset: state.pos - value.length,
    },
    end: {
      line: state.line,
      column: state.column,
      offset: state.pos,
    },
  };
}

function isTokenAtLineStart(state: LexerState): boolean {
  if (state.tokens.length === 0) {
    return true;
  }

  const last = state.tokens[state.tokens.length - 1];
  if (last?.type === "NEWLINE") {
    return true;
  }

  return (
    last?.type === "WHITESPACE" &&
    last.value === " " &&
    state.tokens[state.tokens.length - 2]?.type === "BLOCKQUOTE_MARKER"
  );
}
