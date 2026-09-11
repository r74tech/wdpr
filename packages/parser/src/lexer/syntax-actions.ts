import type { TokenAction } from "./token-actions";
import { findRepeatedCharRunEnd } from "./runs";
import type { TokenType } from "./tokens";
import { startsWithUrl } from "./url-schemes";

export function scanSimpleSyntaxToken(
  src: string,
  pos: number,
  isLineStart: boolean,
): TokenAction | null {
  switch (src[pos]) {
    case "{":
      return pairedToken(src, pos, "{", "MONO_MARKER", "{{");
    case "}":
      return pairedToken(src, pos, "}", "MONO_CLOSE", "}}");
    case "*":
      return scanStarToken(src, pos, isLineStart);
    case "<":
      return pairedToken(src, pos, "<", "LEFT_DOUBLE_ANGLE", "<<");
    case "_":
      return pairedToken(src, pos, "_", "UNDERLINE_MARKER", "__") ?? token("UNDERSCORE", "_");
    case "^":
      return pairedToken(src, pos, "^", "SUPER_MARKER", "^^");
    case ",":
      return pairedToken(src, pos, ",", "SUB_MARKER", ",,");
    case "/":
      return pairedToken(src, pos, "/", "ITALIC_MARKER", "//") ?? token("SLASH", "/");
    case "+":
      return scanHeadingToken(src, pos, isLineStart);
    case "#":
      return scanHashToken(src, pos, isLineStart);
    case "=":
      return token("EQUALS", "=");
    case ":":
      return token("COLON", ":");
    case "&":
      return token("AMPERSAND", "&");
    case "\\":
      return token("BACKSLASH", "\\");
    default:
      return null;
  }
}

function scanStarToken(src: string, pos: number, isLineStart: boolean): TokenAction {
  // `**http://x…` は太字にならない。Wikidotは2つ目の`*`をURLの新規タブプレフィックスとして
  // 扱い、開きの`**`ペアが壊れる（`*` リテラル + `*http://x…` autolink + 末尾`**` リテラル）。
  // 直後が有効なURLのときだけBOLD_MARKERに結合せず単一の`*`として切り出す。
  // `**http://**`のようにURL本体が無い場合はautolinkが成立しないため太字のまま扱う
  if (src[pos + 1] === "*" && !startsWithUrl(src, pos + 2)) {
    return token("BOLD_MARKER", "**");
  }
  return isLineStart ? token("LIST_BULLET", "*") : token("STAR", "*");
}

function scanHeadingToken(src: string, pos: number, isLineStart: boolean): TokenAction | null {
  return isLineStart
    ? runToken(src, pos, findRepeatedCharRunEnd(src, pos, "+"), "HEADING_MARKER")
    : null;
}

function scanHashToken(src: string, pos: number, isLineStart: boolean): TokenAction {
  if (src[pos + 1] === "#") {
    return token("COLOR_MARKER", "##");
  }
  return isLineStart ? token("LIST_NUMBER", "#") : token("HASH", "#");
}

function pairedToken(
  src: string,
  pos: number,
  secondChar: string,
  type: TokenType,
  value: string,
): TokenAction | null {
  return src[pos + 1] === secondChar ? token(type, value) : null;
}

function token(type: TokenType, value: string): TokenAction {
  return { type, value, length: value.length };
}

function runToken(src: string, pos: number, end: number, type: TokenType): TokenAction {
  return { type, value: src.slice(pos, end), length: end - pos };
}
