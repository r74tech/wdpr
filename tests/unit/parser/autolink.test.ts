import { describe, expect, it } from "bun:test";
import { parse } from "@wdprlib/parser";
import type { Element, SyntaxTree } from "@wdprlib/ast";

/**
 * Autolink Unit Tests
 *
 * fixture（tests/fixtures/link/autolink）でカバーしにくいケースを検証する:
 * - 大規模ソースの一括テキスト化（compactTextRuns）経路での自動リンク化
 * - `**`とURLスキームの相互作用（lexerのトークン分割）
 */

function parseAst(input: string): SyntaxTree {
  return parse(input).ast;
}

function getContentElements(doc: SyntaxTree): Element[] {
  return doc.elements.filter((el) => el.element !== "footnote-block");
}

function firstParagraphElements(doc: SyntaxTree): Element[] {
  const first = getContentElements(doc)[0];
  if (first?.element === "container" && first.data.type === "paragraph") {
    return first.data.elements;
  }
  throw new Error("first content element is not a paragraph");
}

const COMPACT_THRESHOLD = 100_000;

describe("autolink", () => {
  describe("compact text run path", () => {
    it("auto-links a URL even when the document triggers the compact text fast path", () => {
      // 10万文字超で有効化されるcompactTextRuns経路でも、スキーム名がテキストへ
      // 融合せず自動リンク化されることを確認する
      const filler = "あ".repeat(COMPACT_THRESHOLD + 1000);
      const doc = parseAst(`${filler}\n\nsee http://example.com/x end`);
      const elements = getContentElements(doc);
      const lastParagraph = elements[elements.length - 1];
      if (lastParagraph?.element !== "container" || lastParagraph.data.type !== "paragraph") {
        throw new Error("expected trailing paragraph");
      }
      expect(lastParagraph.data.elements).toEqual([
        { element: "text", data: "see " },
        {
          element: "link",
          data: {
            type: "direct",
            link: "http://example.com/x",
            extra: null,
            label: { text: "http://example.com/x" },
            target: null,
          },
        },
        { element: "text", data: " end" },
      ]);
    });
  });

  describe("`**` and URL schemes", () => {
    it("keeps `**text**` bold when the marker is not immediately followed by a scheme", () => {
      const elements = firstParagraphElements(parseAst("a **bold** b"));
      expect(elements).toEqual([
        { element: "text", data: "a" },
        { element: "text", data: " " },
        {
          element: "container",
          data: { type: "bold", attributes: {}, elements: [{ element: "text", data: "bold" }] },
        },
        { element: "text", data: " " },
        { element: "text", data: "b" },
      ]);
    });

    it("splits `**http://…**` into literal `*`, new-tab autolink, and trailing `**`", () => {
      // Wikidotは`**http://…**`を太字にせず、2つ目の`*`をURLの新規タブプレフィックス
      // として扱う（`*`リテラル + `*http://…`autolink + 末尾`**`リテラル）
      const elements = firstParagraphElements(parseAst("a **http://example.com/b** c"));
      expect(elements).toEqual([
        { element: "text", data: "a" },
        { element: "text", data: " " },
        { element: "text", data: "*" },
        {
          element: "link",
          data: {
            type: "direct",
            link: "http://example.com/b",
            extra: null,
            label: { text: "http://example.com/b" },
            target: "new-tab",
          },
        },
        { element: "text", data: "**" },
        { element: "text", data: " " },
        { element: "text", data: "c" },
      ]);
    });

    it("keeps `**bold**` bold when a space separates it from a following URL", () => {
      const elements = firstParagraphElements(parseAst("**bold** http://example.com/x"));
      expect(elements).toEqual([
        {
          element: "container",
          data: { type: "bold", attributes: {}, elements: [{ element: "text", data: "bold" }] },
        },
        { element: "text", data: " " },
        {
          element: "link",
          data: {
            type: "direct",
            link: "http://example.com/x",
            extra: null,
            label: { text: "http://example.com/x" },
            target: null,
          },
        },
      ]);
    });

    it("splits the closing `**` when a URL is directly adjacent (`**bold**http://…`)", () => {
      // Text_Wikiの`(\*)?`はスキーム直前の`*`を必ず新規タブプレフィックスとして
      // 奪うため、閉じ`**`も分割され太字が壊れる（`**bold*` + 新規タブリンク）。
      // 空白があれば上のテストのとおり太字は保たれる
      const elements = firstParagraphElements(parseAst("**bold**http://example.com/x"));
      expect(elements).toEqual([
        { element: "text", data: "**" },
        { element: "text", data: "bold" },
        { element: "text", data: "*" },
        {
          element: "link",
          data: {
            type: "direct",
            link: "http://example.com/x",
            extra: null,
            label: { text: "http://example.com/x" },
            target: "new-tab",
          },
        },
      ]);
    });

    it("does not auto-link uppercase or mixed-case schemes (Text_Wiki parity)", () => {
      // Text_WikiのインラインURL正規表現は`i`フラグ無し・スキーム小文字のみのため、
      // Wikidotは`HTTP://…`をリンク化しない。wdprも小文字のみリンク化する
      for (const input of ["a HTTP://example.com/x b", "a Http://example.com/x b"]) {
        const elements = firstParagraphElements(parseAst(input));
        expect(elements.filter((el) => el.element === "link")).toEqual([]);
      }
    });

    it("stops the URL at an enclosing block close so the span still closes", () => {
      // `[[span]]http://x/[[/span]]` で生URLが`[[/span]]`を飲み込まないこと
      const doc = parseAst("[[span]]http://example.com/s[[/span]]");
      const paragraph = firstParagraphElements(doc);
      expect(paragraph).toEqual([
        {
          element: "container",
          data: {
            type: "span",
            attributes: {},
            elements: [
              {
                element: "link",
                data: {
                  type: "direct",
                  link: "http://example.com/s",
                  extra: null,
                  label: { text: "http://example.com/s" },
                  target: null,
                },
              },
            ],
          },
        },
      ]);
    });

    it("keeps `**http://**` bold when no URL body follows the scheme", () => {
      // スキーム接頭辞だけで有効なURLが続かない場合は分割せず通常の太字にする
      // （Text_WikiのUrl正規表現は末尾に有効文字を要求するため`http://`単体は非リンク）
      const elements = firstParagraphElements(parseAst("a **http://** b"));
      expect(elements).toEqual([
        { element: "text", data: "a" },
        { element: "text", data: " " },
        {
          element: "container",
          data: {
            type: "bold",
            attributes: {},
            elements: [
              { element: "text", data: "http" },
              { element: "text", data: ":" },
              { element: "text", data: "//" },
            ],
          },
        },
        { element: "text", data: " " },
        { element: "text", data: "b" },
      ]);
    });

    it("keeps bold for scheme-like text that is not autolinkable (`**http:foo**`)", () => {
      // `http:foo`は`://`が無くautolinkされないため、`**`は通常の太字のまま
      const elements = firstParagraphElements(parseAst("a **http:foo** b"));
      expect(elements).toEqual([
        { element: "text", data: "a" },
        { element: "text", data: " " },
        {
          element: "container",
          data: {
            type: "bold",
            attributes: {},
            elements: [
              { element: "text", data: "http" },
              { element: "text", data: ":" },
              { element: "text", data: "foo" },
            ],
          },
        },
        { element: "text", data: " " },
        { element: "text", data: "b" },
      ]);
    });
  });
});
