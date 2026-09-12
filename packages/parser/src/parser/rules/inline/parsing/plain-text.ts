import { getEmailCandidate } from "../email/candidates";
import type { TokenType } from "../../../../lexer";
import { URL_SCHEME_NAMES } from "../../../../lexer/url-schemes";
import type { ParseContext } from "../../types";

const MIN_INLINE_TEXT_RUN_LENGTH = 32;
export const MIN_INLINE_TEXT_RUN_DOCUMENT_TOKENS = 100_000;

export type InlineEndType = TokenType | "PARAGRAPH_BREAK";

export interface PlainTextRun {
  value: string;
  consumed: number;
}

export function collectLongPlainTextRun(
  ctx: ParseContext,
  startPos: number,
  endType: InlineEndType,
): PlainTextRun | null {
  const firstToken = ctx.tokens[startPos];
  if (
    !getEmailCandidate(ctx.tokens, startPos) &&
    firstToken?.type === "TEXT" &&
    firstToken.value.length >= MIN_INLINE_TEXT_RUN_LENGTH &&
    firstToken.value !== "("
  ) {
    return { value: firstToken.value, consumed: 1 };
  }

  let pos = startPos;
  let totalLength = 0;
  const parts: string[] = [];

  while (pos < ctx.tokens.length) {
    const token = ctx.tokens[pos];
    if (!token || token.type === "EOF" || token.type === "NEWLINE" || token.type === endType) {
      break;
    }
    if (!isPlainTextRunToken(ctx, pos)) {
      break;
    }

    parts.push(token.value);
    totalLength += token.value.length;
    pos++;
  }

  return totalLength >= MIN_INLINE_TEXT_RUN_LENGTH
    ? { value: parts.join(""), consumed: pos - startPos }
    : null;
}

function isPlainTextRunToken(ctx: ParseContext, pos: number): boolean {
  const token = ctx.tokens[pos];
  if (!token || getEmailCandidate(ctx.tokens, pos)) return false;

  if (token.type === "IDENTIFIER") {
    // 連続平文の一括テキスト化がURL先頭のスキーム名を取り込むと
    // autolinkルールに到達しなくなるため、スキーム名の手前で止める
    return !(URL_SCHEME_NAMES.has(token.value) && ctx.tokens[pos + 1]?.type === "COLON");
  }

  if (token.type === "WHITESPACE") {
    const next = ctx.tokens[pos + 1];
    return next?.type !== "BACKSLASH_BREAK" && next?.type !== "UNDERSCORE";
  }

  if (token.type !== "TEXT") {
    return false;
  }

  return token.value !== "(";
}
