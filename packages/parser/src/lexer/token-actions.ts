import type { TokenType } from "./tokens";
import { findRepeatedCharRunEnd } from "./runs";

export interface TokenAction {
  type: TokenType;
  value: string;
  length: number;
  splitBlockCloseAt?: number;
}

export function scanOpeningBracketToken(
  src: string,
  pos: number,
  invalidAnchorEnd: number | null,
): TokenAction {
  if (src[pos + 1] === "!" && src[pos + 2] === "-" && src[pos + 3] === "-") {
    return token("COMMENT_OPEN", "[!--");
  }
  if (src[pos + 1] === "[" && src[pos + 2] === "[") {
    return token("LINK_OPEN", "[[[");
  }
  if (src[pos + 1] === "[" && src[pos + 2] === "/") {
    return token("BLOCK_END_OPEN", "[[/");
  }
  if (src[pos + 1] === "[") {
    if (invalidAnchorEnd !== null) {
      return { ...token("TEXT", "["), splitBlockCloseAt: invalidAnchorEnd };
    }
    return token("BLOCK_OPEN", "[[");
  }
  if (src[pos + 1] === "#") {
    return token("BRACKET_ANCHOR", "[#");
  }
  if (src[pos + 1] === "*") {
    return token("BRACKET_STAR", "[*");
  }
  return token("BRACKET_OPEN", "[");
}

export function scanClosingBracketToken(
  src: string,
  pos: number,
  splitBlockClose: boolean,
): TokenAction | TokenAction[] {
  if (src[pos + 1] === "]" && src[pos + 2] === "]") {
    return token("LINK_CLOSE", "]]]");
  }
  if (src[pos + 1] === "]") {
    if (splitBlockClose) {
      return [token("BRACKET_CLOSE", "]"), token("TEXT", "]")];
    }
    return token("BLOCK_CLOSE", "]]");
  }
  return token("BRACKET_CLOSE", "]");
}

export function scanAtToken(src: string, pos: number): TokenAction {
  if (src[pos + 1] === "@") {
    return token("RAW_OPEN", "@@");
  }
  if (src[pos + 1] === "<") {
    return token("RAW_BLOCK_OPEN", "@<");
  }
  return token("AT", "@");
}

export function scanGreaterToken(src: string, pos: number, isLineStart: boolean): TokenAction {
  if (src[pos + 1] === "@") {
    return token("RAW_BLOCK_CLOSE", ">@");
  }
  if (isLineStart) {
    return runToken(src, pos, findRepeatedCharRunEnd(src, pos, ">"), "BLOCKQUOTE_MARKER");
  }
  if (src[pos + 1] === ">") {
    return token("RIGHT_DOUBLE_ANGLE", ">>");
  }
  return token("TEXT", ">");
}

export function scanDashToken(src: string, pos: number, isLineStart: boolean): TokenAction {
  if (isLineStart && src[pos + 1] === "-" && src[pos + 2] === "-" && src[pos + 3] === "-") {
    return runToken(src, pos, findRepeatedCharRunEnd(src, pos, "-"), "HR_MARKER");
  }
  if (src[pos + 1] === "-" && src[pos + 2] === "]") {
    return token("COMMENT_CLOSE", "--]");
  }
  if (src[pos + 1] === "-") {
    return token("STRIKE_MARKER", "--");
  }
  return token("TEXT", "-");
}

export function scanTildeToken(
  src: string,
  pos: number,
  isLineStart: boolean,
): TokenAction | null {
  if (!isLineStart || src[pos + 1] !== "~" || src[pos + 2] !== "~" || src[pos + 3] !== "~") {
    return null;
  }

  const end = findRepeatedCharRunEnd(src, pos, "~");
  const next = src[end];
  if (next === "<") {
    return runToken(src, pos, end + 1, "CLEAR_FLOAT_LEFT");
  }
  if (next === ">") {
    return runToken(src, pos, end + 1, "CLEAR_FLOAT_RIGHT");
  }
  return runToken(src, pos, end, "CLEAR_FLOAT");
}

export function scanPipeToken(src: string, pos: number): TokenAction {
  if (src[pos + 1] !== "|") {
    return token("PIPE", "|");
  }

  const third = src[pos + 2];
  if (third === "~") {
    return token("TABLE_HEADER", "||~");
  }
  if (third === "<") {
    return token("TABLE_LEFT", "||<");
  }
  if (third === "=") {
    return token("TABLE_CENTER", "||=");
  }
  if (third === ">") {
    return token("TABLE_RIGHT", "||>");
  }
  return token("TABLE_MARKER", "||");
}

function token(type: TokenType, value: string): TokenAction {
  return { type, value, length: value.length };
}

function runToken(src: string, pos: number, end: number, type: TokenType): TokenAction {
  return { type, value: src.slice(pos, end), length: end - pos };
}
