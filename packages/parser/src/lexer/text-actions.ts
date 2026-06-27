import {
  findAsciiIdentifierEnd,
  findCompactPlainTextRunEnd,
  findLongPlainTextRunEnd,
  isAsciiAlphanumericCode,
} from "./runs";
import type { TokenAction } from "./token-actions";

export function scanTextToken(src: string, pos: number): TokenAction {
  const char = src[pos] ?? "";

  // Backslash line break marker (U+E000, inserted by preproc)
  if (char.charCodeAt(0) === 0xe000) {
    return token("BACKSLASH_BREAK", char);
  }

  const plainTextRunEnd = findLongPlainTextRunEnd(src, pos);
  if (plainTextRunEnd !== null) {
    return runToken(src, pos, plainTextRunEnd, "TEXT");
  }

  const code = char.charCodeAt(0);
  if (isAsciiAlphanumericCode(code)) {
    return runToken(src, pos, findAsciiIdentifierEnd(src, pos), "IDENTIFIER");
  }

  return token("TEXT", char);
}

export function scanCompactTextToken(src: string, pos: number): TokenAction | null {
  const end = findCompactPlainTextRunEnd(src, pos);
  return end > pos ? runToken(src, pos, end, "TEXT") : null;
}

function token(type: TokenAction["type"], value: string): TokenAction {
  return { type, value, length: value.length };
}

function runToken(src: string, pos: number, end: number, type: TokenAction["type"]): TokenAction {
  return { type, value: src.slice(pos, end), length: end - pos };
}
