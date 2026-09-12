/**
 *
 * Parses bare URLs in plain text into links (auto-linking).
 *
 * Wikidot converts bare URLs like `http://example.com/page` into
 * `<a href="URL">URL</a>` without any bracket syntax. A `*` prefix
 * (`*http://...`) opens the link in a new tab.
 *
 * Mirrors Text_Wiki's Url rule (Parse/Default/Url.php):
 * - Recognized schemes: `http://`, `https://`, `ftp://`, `gopher://`,
 *   `news://`, `mms://`, and `mailto:`
 * - A URL is only recognized at line start or after a non-alphabetic
 *   character (`(^|[^A-Za-z])` in the original regex)
 * - The final character of a URL must be alphanumeric or one of
 *   `%/?=&~_`, so trailing punctuation (`.`, `,`, `)` etc.) stays as text
 *
 * Produces a `"link"` AST element with `type: "direct"`.
 *
 * @module
 */
import type { AnchorTarget, Element } from "@wdprlib/ast";
import type { TokenType } from "../../../lexer";
import { URL_PATTERN, URL_SCHEME_NAMES } from "../../../lexer/url-schemes";
import type { InlineRule, ParseContext, RuleResult } from "../types";
import { rawRegionEnd } from "./raw/end";

/**
 * Structural block/link delimiters that terminate a bare URL. Wikitext
 * constructs like `[[span]]…[[/span]]` and `[[[page]]]` are resolved before
 * URLs in Text_Wiki (their bodies are delimiter-wrapped), so a bare URL must
 * not swallow the enclosing scope's close marker (e.g. the `[[/span]]` in
 * `[[span]]http://x/[[/span]]`).
 */
const URL_BOUNDARY_TOKENS: ReadonlySet<TokenType> = new Set<TokenType>([
  "WHITESPACE",
  "NEWLINE",
  "EOF",
  "BLOCK_OPEN",
  "BLOCK_END_OPEN",
  "BLOCK_CLOSE",
  "LINK_OPEN",
  "LINK_CLOSE",
  "COMMENT_OPEN",
  "BACKSLASH_BREAK",
]);

/**
 * Inline rule for auto-linking bare URLs.
 *
 * Triggered by an `IDENTIFIER` token whose value is a URL scheme name,
 * or by a `*` prefix (`STAR` mid-line, `LIST_BULLET` at line start —
 * the list rule requires a space after the marker, so `*http://...`
 * falls through to inline parsing).
 */
export const autolinkRule: InlineRule = {
  name: "autolink",
  startTokens: ["IDENTIFIER", "STAR", "LIST_BULLET"],

  parse(ctx: ParseContext): RuleResult<Element> {
    let pos = ctx.pos;
    let target: AnchorTarget | null = null;

    const first = ctx.tokens[pos];
    if (!first) {
      return { success: false };
    }

    if (first.type === "STAR" || first.type === "LIST_BULLET") {
      if (first.value !== "*") {
        return { success: false };
      }
      target = "new-tab";
      pos++;
    }

    const scheme = ctx.tokens[pos];
    if (scheme?.type !== "IDENTIFIER" || !URL_SCHEME_NAMES.has(scheme.value)) {
      return { success: false };
    }
    if (ctx.tokens[pos + 1]?.type !== "COLON") {
      return { success: false };
    }

    // Text_Wikiの前置条件 `(^|[^A-Za-z])`: 行頭または非英字の直後でのみURLと認識する
    const prev = ctx.tokens[ctx.pos - 1];
    if (prev && !first.lineStart) {
      const lastChar = prev.value[prev.value.length - 1] ?? "";
      if (/[A-Za-z]/.test(lastChar)) {
        return { success: false };
      }
    }

    // URL候補: 空白・改行・構造デリミタの手前までのトークン列を文字列として連結する。
    // ブロック/リンクの開閉トークン（[[ ]] [[/ [[[ ]]]）で止めることで、
    // 囲みスコープの閉じマーカー（[[/span]]等）をURLに取り込まないようにする
    const values: string[] = [];
    let end = pos;
    const inlineEnd = ctx.scope.inlineEnd ?? ctx.tokens.length;
    while (end < inlineEnd) {
      const token = ctx.tokens[end];
      if (!token || URL_BOUNDARY_TOKENS.has(token.type)) {
        break;
      }
      if (token.type === "RAW_OPEN" || token.type === "RAW_BLOCK_OPEN") {
        if (rawRegionEnd(ctx.tokens, end, inlineEnd) > end) break;
      }
      values.push(token.value);
      end++;
      // Compact TEXT tokens can contain whitespace; do not scan subsequent URLs again.
      if (/[ \t\n\\"']/.test(token.value)) break;
    }

    const candidate = values.join("");
    const match = URL_PATTERN.exec(candidate);
    if (!match) {
      return { success: false };
    }

    // マッチ全体を含むところまでトークンを消費する。大きなソースの一括テキスト化では
    // `page. b` のようにURL末尾と後続テキストが同一トークンに融合するため、マッチ終端が
    // トークン中間に落ちた場合は残り部分をテキスト要素として返す
    const url = match[0];
    let length = 0;
    let count = 0;
    while (length < url.length) {
      length += values[count]?.length ?? 0;
      count++;
    }
    const rest = candidate.slice(url.length, length);

    const elements: Element[] = [
      {
        element: "link",
        data: {
          type: "direct",
          link: url,
          extra: null,
          label: { text: url },
          target,
        },
      },
    ];
    if (rest !== "") {
      elements.push({ element: "text", data: rest });
    }

    return {
      success: true,
      elements,
      consumed: pos - ctx.pos + count,
    };
  },
};
