import {
  findAsciiIdentifierEnd,
  findCompactPlainTextRunEnd,
  findLongPlainTextRunEnd,
  isAsciiAlphanumericCode,
} from "./runs";
import type { TokenAction } from "./token-actions";
import { TRAILING_URL_SCHEME } from "./url-schemes";

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
  let end = findCompactPlainTextRunEnd(src, pos);

  // 生URLの自動リンク化はIDENTIFIERトークンのスキーム名から発火する。
  // このcompactモード（大きなソースで連続する平文を1つのTEXTトークンにまとめる高速化）が
  // `see http` のようにスキーム名までTEXTに取り込むとリンク化されなくなるため、
  // 次の文字が`:`でトークンがスキーム名で終わる場合はスキーム名の手前で切り、
  // スキーム名を通常のIDENTIFIERスキャンに委ねる
  if (end > pos && src[end] === ":") {
    const match = TRAILING_URL_SCHEME.exec(src.slice(pos, end));
    if (match) {
      end -= match[1]!.length;
    }
  }

  return end > pos ? runToken(src, pos, end, "TEXT") : null;
}

function token(type: TokenAction["type"], value: string): TokenAction {
  return { type, value, length: value.length };
}

function runToken(src: string, pos: number, end: number, type: TokenAction["type"]): TokenAction {
  return { type, value: src.slice(pos, end), length: end - pos };
}
