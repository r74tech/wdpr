import { describe, expect, it } from "bun:test";
import { parse } from "@wdprlib/parser";
import type { Element, SyntaxTree } from "@wdprlib/ast";

/**
 * Parser Unit Tests
 *
 * 厳格なルール:
 * 1. 期待するASTをJSONで定義し、完全一致を検証
 * 2. 曖昧な検証（toBeGreaterThan, some(), if分岐）を使用しない
 * 3. fixtureで既にカバーされているケースは重複しない
 *
 * fixtureでカバー済み:
 * - heading: tests/fixtures/heading/
 * - list: tests/fixtures/list/
 * - blockquote: tests/fixtures/blockquote/
 * - bold/italic/underline/strikethrough/superscript/subscript/monospace: tests/fixtures/各ディレクトリ
 * - link: tests/fixtures/link/
 * - raw: tests/fixtures/raw/
 * - color: tests/fixtures/color/
 * - line-break: tests/fixtures/line-breaks/
 *
 * このファイルでは、fixtureでカバーしにくいケースや、
 * パーサーの細かい仕様を検証する。
 */

const FOOTNOTE_BLOCK = { element: "footnote-block", data: { title: null, hide: false } } as const;

// footnote-blockを除去してテスト対象の要素のみ取得
function getContentElements(doc: SyntaxTree): Element[] {
  return doc.elements.filter((el) => el.element !== "footnote-block");
}

describe("Parser", () => {
  describe("document structure", () => {
    it("empty string produces only footnote-block", () => {
      const doc = parse("");
      expect(doc.elements).toEqual([FOOTNOTE_BLOCK]);
    });

    it("single text produces paragraph with text and footnote-block", () => {
      const doc = parse("Hello");
      expect(doc.elements).toEqual([
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [{ element: "text", data: "Hello" }],
          },
        },
        FOOTNOTE_BLOCK,
      ]);
    });
  });

  describe("paragraph separation", () => {
    it("blank line creates separate paragraphs", () => {
      const doc = parse("First\n\nSecond");
      const content = getContentElements(doc);

      expect(content).toEqual([
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [{ element: "text", data: "First" }],
          },
        },
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [{ element: "text", data: "Second" }],
          },
        },
      ]);
    });

    it("multiple blank lines are treated as single separator", () => {
      const doc = parse("First\n\n\n\nSecond");
      const content = getContentElements(doc);

      expect(content).toHaveLength(2);
      expect(content[0]).toMatchObject({ data: { elements: [{ data: "First" }] } });
      expect(content[1]).toMatchObject({ data: { elements: [{ data: "Second" }] } });
    });
  });

  describe("horizontal rule", () => {
    it("---- produces horizontal-rule", () => {
      const doc = parse("----");
      const content = getContentElements(doc);

      expect(content).toEqual([{ element: "horizontal-rule" }]);
    });

    it("longer dashes also produce horizontal-rule", () => {
      const doc = parse("--------");
      const content = getContentElements(doc);

      expect(content).toEqual([{ element: "horizontal-rule" }]);
    });
  });

  describe("unclosed inline formatting", () => {
    it("unclosed ** is treated as separate text nodes", () => {
      const doc = parse("**unclosed");
      const content = getContentElements(doc);

      expect(content).toEqual([
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [
              { element: "text", data: "**" },
              { element: "text", data: "unclosed" },
            ],
          },
        },
      ]);
    });

    it("unclosed // is treated as separate text nodes", () => {
      const doc = parse("//unclosed");
      const content = getContentElements(doc);

      expect(content).toEqual([
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [
              { element: "text", data: "//" },
              { element: "text", data: "unclosed" },
            ],
          },
        },
      ]);
    });

    it("unclosed @@ is treated as separate text nodes", () => {
      const doc = parse("@@unclosed");
      const content = getContentElements(doc);

      expect(content).toEqual([
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [
              { element: "text", data: "@@" },
              { element: "text", data: "unclosed" },
            ],
          },
        },
      ]);
    });
  });

  describe("raw escape special cases", () => {
    it("@@@@ produces empty raw", () => {
      const doc = parse("@@@@");
      const content = getContentElements(doc);

      expect(content).toEqual([
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [{ element: "raw", data: "" }],
          },
        },
      ]);
    });

    it("@@@@@ produces raw with single @", () => {
      const doc = parse("@@@@@");
      const content = getContentElements(doc);

      expect(content).toEqual([
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [{ element: "raw", data: "@" }],
          },
        },
      ]);
    });

    it("@@@@@@ produces raw with @@", () => {
      const doc = parse("@@@@@@");
      const content = getContentElements(doc);

      expect(content).toEqual([
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [{ element: "raw", data: "@@" }],
          },
        },
      ]);
    });
  });

  describe("comment", () => {
    it("comment is discarded from output", () => {
      const doc = parse("[!-- comment --]visible");
      const content = getContentElements(doc);

      expect(content).toEqual([
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [{ element: "text", data: "visible" }],
          },
        },
      ]);
    });

    it("comment between text is removed", () => {
      const doc = parse("before[!-- hidden --]after");
      const content = getContentElements(doc);

      expect(content).toEqual([
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [
              { element: "text", data: "before" },
              { element: "text", data: "after" },
            ],
          },
        },
      ]);
    });

    it("multi-line comment is removed", () => {
      const doc = parse("[!-- line 1\nline 2 --]after");
      const content = getContentElements(doc);

      expect(content).toEqual([
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [{ element: "text", data: "after" }],
          },
        },
      ]);
    });
  });

  describe("color without pipe separator", () => {
    it("##red## without pipe is treated as separate text nodes", () => {
      const doc = parse("##red##");
      const content = getContentElements(doc);

      expect(content).toEqual([
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [
              { element: "text", data: "##" },
              { element: "text", data: "red" },
              { element: "text", data: "##" },
            ],
          },
        },
      ]);
    });
  });

  describe("fake anchor link", () => {
    it("[# label] produces javascript:; link with type anchor", () => {
      const doc = parse("[# Click me]");
      const content = getContentElements(doc);

      expect(content).toEqual([
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [
              {
                element: "link",
                data: {
                  type: "anchor",
                  link: "javascript:;",
                  extra: null,
                  label: { text: "Click me" },
                  target: null,
                },
              },
            ],
          },
        },
      ]);
    });
  });

  describe("mixed block elements", () => {
    it("heading followed by paragraph", () => {
      const doc = parse("+ Title\n\nContent");
      const content = getContentElements(doc);

      expect(content).toHaveLength(2);
      expect(content[0]).toMatchObject({
        element: "container",
        data: {
          type: { header: { level: 1, "has-toc": true } },
          elements: [{ element: "text", data: "Title" }],
        },
      });
      expect(content[1]).toMatchObject({
        element: "container",
        data: {
          type: "paragraph",
          elements: [{ element: "text", data: "Content" }],
        },
      });
    });

    it("list followed by paragraph", () => {
      const doc = parse("* Item\n\nParagraph");
      const content = getContentElements(doc);

      expect(content).toHaveLength(2);
      expect(content[0]).toMatchObject({
        element: "list",
        data: { type: "bullet" },
      });
      expect(content[1]).toMatchObject({
        element: "container",
        data: { type: "paragraph" },
      });
    });

    it("different list types create separate lists", () => {
      const doc = parse("* Bullet\n# Number");
      const content = getContentElements(doc);

      expect(content).toHaveLength(2);
      expect(content[0]).toMatchObject({
        element: "list",
        data: { type: "bullet" },
      });
      expect(content[1]).toMatchObject({
        element: "list",
        data: { type: "numbered" },
      });
    });
  });

  describe("image attribute parsing", () => {
    type ImageData = { source: unknown; attributes: Record<string, string> };
    type ContainerData = { elements: { element: string; data: ImageData }[] };

    function getImageFromParagraph(content: Element[]): { element: string; data: ImageData } {
      const para = content[0] as { element: string; data: ContainerData };
      expect(para.element).toBe("container");
      expect(para.data.elements.length).toBeGreaterThan(0);
      return para.data.elements[0] as { element: string; data: ImageData };
    }

    // data-* attributes should not be accepted (Wikidot behavior)
    // Importantly, they should not bypass security by splitting into separate attributes
    it("data-src does not override src or become separate attribute", () => {
      const doc = parse('[[image foo.jpg data-src="evil.jpg"]]');
      const content = getContentElements(doc);

      expect(content).toHaveLength(1);
      const img = getImageFromParagraph(content);
      expect(img.element).toBe("image");
      // data-src should be ignored entirely
      expect(img.data.attributes).toEqual({});
      // source should remain foo.jpg, not overwritten
      expect(img.data.source).toEqual({ type: "file1", data: { file: "foo.jpg" } });
    });

    it("data--src (double hyphen) does not bypass to separate src", () => {
      const doc = parse('[[image foo.jpg data--src="evil.jpg"]]');
      const content = getContentElements(doc);

      expect(content).toHaveLength(1);
      const img = getImageFromParagraph(content);
      expect(img.element).toBe("image");
      // data--src should be ignored entirely (no src attribute should be created)
      expect(img.data.attributes).toEqual({});
      expect(img.data.source).toEqual({ type: "file1", data: { file: "foo.jpg" } });
    });

    it("data---src (triple hyphen) does not bypass to separate src", () => {
      const doc = parse('[[image foo.jpg data---src="evil.jpg"]]');
      const content = getContentElements(doc);

      expect(content).toHaveLength(1);
      const img = getImageFromParagraph(content);
      expect(img.element).toBe("image");
      expect(img.data.attributes).toEqual({});
      expect(img.data.source).toEqual({ type: "file1", data: { file: "foo.jpg" } });
    });

    it("data----src (quadruple hyphen) does not bypass to separate src", () => {
      const doc = parse('[[image foo.jpg data----src="evil.jpg"]]');
      const content = getContentElements(doc);

      expect(content).toHaveLength(1);
      const img = getImageFromParagraph(content);
      expect(img.element).toBe("image");
      expect(img.data.attributes).toEqual({});
      expect(img.data.source).toEqual({ type: "file1", data: { file: "foo.jpg" } });
    });

    it("valid image attributes are preserved", () => {
      const doc = parse('[[image foo.jpg alt="Description" width="100"]]');
      const content = getContentElements(doc);

      expect(content).toHaveLength(1);
      const img = getImageFromParagraph(content);
      expect(img.element).toBe("image");
      expect(img.data.attributes).toEqual({ alt: "Description", width: "100" });
    });
  });
});
