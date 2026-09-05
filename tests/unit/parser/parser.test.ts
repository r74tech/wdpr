import { describe, expect, it } from "bun:test";
import { parse, type ParserOptions } from "@wdprlib/parser";
import type { Element, SyntaxTree } from "@wdprlib/ast";

function parseAst(input: string, options?: ParserOptions): SyntaxTree {
  return parse(input, options).ast;
}

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
      const doc = parseAst("");
      expect(doc.elements).toEqual([FOOTNOTE_BLOCK]);
    });

    it("single text produces paragraph with text and footnote-block", () => {
      const doc = parseAst("Hello");
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

  describe("module closing tag", () => {
    it("keeps an incomplete closing directive inside the module body", () => {
      const doc = parseAst(
        [
          '[[module ListUsers users="."]]',
          "before",
          "[[/module{$g}]|g=]]",
          "after",
          "[[/module]]",
        ].join("\n"),
      );

      expect(getContentElements(doc)).toEqual([
        {
          element: "module",
          data: {
            module: "list-users",
            users: ".",
            body: "before\n[[/module{$g}]|g=]]\nafter",
            attributes: {},
          },
        },
      ]);
    });
  });

  describe("paragraph separation", () => {
    it("blank line creates separate paragraphs", () => {
      const doc = parseAst("First\n\nSecond");
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
      const doc = parseAst("First\n\n\n\nSecond");
      const content = getContentElements(doc);

      expect(content).toHaveLength(2);
      expect(content[0]).toMatchObject({ data: { elements: [{ data: "First" }] } });
      expect(content[1]).toMatchObject({ data: { elements: [{ data: "Second" }] } });
    });
  });

  describe("horizontal rule", () => {
    it("---- produces horizontal-rule", () => {
      const doc = parseAst("----");
      const content = getContentElements(doc);

      expect(content).toEqual([{ element: "horizontal-rule" }]);
    });

    it("longer dashes also produce horizontal-rule", () => {
      const doc = parseAst("--------");
      const content = getContentElements(doc);

      expect(content).toEqual([{ element: "horizontal-rule" }]);
    });
  });

  describe("unclosed inline formatting", () => {
    it("unclosed ** is treated as separate text nodes", () => {
      const doc = parseAst("**unclosed");
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
      const doc = parseAst("//unclosed");
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
      const doc = parseAst("@@unclosed");
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
    it("@@@@ produces text with @@", () => {
      const doc = parseAst("@@@@");
      const content = getContentElements(doc);

      expect(content).toEqual([
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [{ element: "text", data: "@@" }],
          },
        },
      ]);
    });

    it("@@@@@ produces text with single @", () => {
      const doc = parseAst("@@@@@");
      const content = getContentElements(doc);

      expect(content).toEqual([
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [{ element: "text", data: "@" }],
          },
        },
      ]);
    });

    it("@@@@@@ produces text with @@", () => {
      const doc = parseAst("@@@@@@");
      const content = getContentElements(doc);

      expect(content).toEqual([
        {
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: [{ element: "text", data: "@@" }],
          },
        },
      ]);
    });
  });

  describe("comment", () => {
    it("comment is discarded from output", () => {
      const doc = parseAst("[!-- comment --]visible");
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
      const doc = parseAst("before[!-- hidden --]after");
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
      const doc = parseAst("[!-- line 1\nline 2 --]after");
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
      const doc = parseAst("##red##");
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
      const doc = parseAst("[# Click me]");
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
      const doc = parseAst("+ Title\n\nContent");
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
      const doc = parseAst("* Item\n\nParagraph");
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
      const doc = parseAst("* Bullet\n# Number");
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
      const doc = parseAst('[[image foo.jpg data-src="evil.jpg"]]');
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
      const doc = parseAst('[[image foo.jpg data--src="evil.jpg"]]');
      const content = getContentElements(doc);

      expect(content).toHaveLength(1);
      const img = getImageFromParagraph(content);
      expect(img.element).toBe("image");
      // data--src should be ignored entirely (no src attribute should be created)
      expect(img.data.attributes).toEqual({});
      expect(img.data.source).toEqual({ type: "file1", data: { file: "foo.jpg" } });
    });

    it("data---src (triple hyphen) does not bypass to separate src", () => {
      const doc = parseAst('[[image foo.jpg data---src="evil.jpg"]]');
      const content = getContentElements(doc);

      expect(content).toHaveLength(1);
      const img = getImageFromParagraph(content);
      expect(img.element).toBe("image");
      expect(img.data.attributes).toEqual({});
      expect(img.data.source).toEqual({ type: "file1", data: { file: "foo.jpg" } });
    });

    it("data----src (quadruple hyphen) does not bypass to separate src", () => {
      const doc = parseAst('[[image foo.jpg data----src="evil.jpg"]]');
      const content = getContentElements(doc);

      expect(content).toHaveLength(1);
      const img = getImageFromParagraph(content);
      expect(img.element).toBe("image");
      expect(img.data.attributes).toEqual({});
      expect(img.data.source).toEqual({ type: "file1", data: { file: "foo.jpg" } });
    });

    it("valid image attributes are preserved", () => {
      const doc = parseAst('[[image foo.jpg alt="Description" width="100"]]');
      const content = getContentElements(doc);

      expect(content).toHaveLength(1);
      const img = getImageFromParagraph(content);
      expect(img.element).toBe("image");
      expect(img.data.attributes).toEqual({ alt: "Description", width: "100" });
    });
  });

  describe("pageTags option (opener-embedded [[iftags]])", () => {
    const OPENER_EMBEDDED = `[[div_ class="rateBox" [[iftags +highlight]]style="display:none;"[[/iftags]]]]
inside
[[/div_]]`;

    function findDivContainer(
      elements: readonly Element[],
    ): (Element & { element: "container" }) | undefined {
      return elements.find(
        (el): el is Element & { element: "container" } =>
          el.element === "container" && (el.data as { type: string }).type === "div",
      );
    }

    function hasIfTags(els: readonly Element[]): boolean {
      return els.some((el) => {
        if (el.element === "if-tags") return true;
        const data = (el as { data?: unknown }).data;
        if (data && typeof data === "object" && "elements" in data) {
          const children = (data as { elements?: unknown }).elements;
          if (Array.isArray(children)) return hasIfTags(children as Element[]);
        }
        return false;
      });
    }

    it("without pageTags option, opener-embedded iftags break the surrounding opener", () => {
      // Backward-compat: parse(src) is unchanged. The opener fails to
      // tokenize, so no `div`-type container is produced — the line falls
      // through to the paragraph fallback rule instead.
      const doc = parseAst(OPENER_EMBEDDED);
      const content = getContentElements(doc);
      expect(findDivContainer(content)).toBeUndefined();
    });

    it("pageTags: [] collapses opener-embedded iftags with empty tags (+tag fails)", () => {
      const doc = parseAst(OPENER_EMBEDDED, { pageTags: [] });
      const content = getContentElements(doc);
      const container = findDivContainer(content);
      expect(container).toBeDefined();
      // style="display:none;" is dropped because +highlight fails against [].
      const attrs = (container!.data as { attributes?: Record<string, string> }).attributes ?? {};
      expect(attrs.class).toBe("rateBox");
      expect(attrs.style).toBeUndefined();
    });

    it("pageTags: ['highlight'] keeps the conditional style attribute", () => {
      const doc = parseAst(OPENER_EMBEDDED, { pageTags: ["highlight"] });
      const content = getContentElements(doc);
      const container = findDivContainer(content);
      expect(container).toBeDefined();
      const attrs = (container!.data as { attributes?: Record<string, string> }).attributes ?? {};
      expect(attrs.class).toBe("rateBox");
      expect(attrs.style).toBe("display:none;");
    });

    it("pageTags: null collapses opener-embedded with empty-tag fallback but keeps block-level iftags", () => {
      const src = `${OPENER_EMBEDDED}

[[iftags +foo]]conditional[[/iftags]]`;
      const doc = parseAst(src, { pageTags: null });
      const content = getContentElements(doc);
      // Opener-embedded one becomes a valid div container.
      expect(findDivContainer(content)).toBeDefined();
      // Block-level iftags survives in the AST for the resolver.
      expect(hasIfTags(content)).toBe(true);
    });
  });
  describe("blockquote content", () => {
    function blockTypes(input: string): string[] {
      function collect(elements: Element[], out: string[]): string[] {
        for (const el of elements) {
          if (el.element === "text") continue;
          if (el.element !== "container") {
            out.push(el.element);
            continue;
          }
          const type = (el.data as { type: unknown }).type;
          out.push(typeof type === "string" ? type : JSON.stringify(type));
          collect((el.data as { elements: Element[] }).elements, out);
        }
        return out;
      }
      return collect(getContentElements(parseAst(input)), []);
    }

    it("parses a heading inside a blockquote", () => {
      expect(blockTypes("> +++ A")).toEqual([
        "blockquote",
        '{"header":{"level":3,"has-toc":true}}',
      ]);
    });

    it("keeps * out of the table of contents", () => {
      expect(blockTypes("> +++* A")).toEqual([
        "blockquote",
        '{"header":{"level":3,"has-toc":false}}',
      ]);
    });

    it("nests lists by content indent", () => {
      const doc = parseAst("> * a\n>  * b");
      const quote = getContentElements(doc)[0]!;
      const list = (quote.data as { elements: Element[] }).elements[0]!;
      const items = (list.data as { items: { "item-type": string }[] }).items;
      expect(list.element).toBe("list");
      expect(items.map((i) => i["item-type"])).toEqual(["elements", "sub-list"]);
    });

    it("does not treat an indented marker as a heading", () => {
      expect(blockTypes(">  +++ A")).toEqual(["blockquote", "paragraph"]);
    });

    it("keeps protected block tags literal but parses their body", () => {
      expect(blockTypes("> [[code]]\n> +++ A\n> [[/code]]")).toEqual([
        "blockquote",
        "paragraph",
        '{"header":{"level":3,"has-toc":true}}',
        "paragraph",
      ]);
    });

    it("splits paragraphs on a quoted blank line", () => {
      expect(blockTypes("> a\n> \n> b")).toEqual(["blockquote", "paragraph", "paragraph"]);
    });

    it("keeps one paragraph when the marker has no space", () => {
      expect(blockTypes("> a\n>\n> b")).toEqual(["blockquote", "paragraph", "line-break"]);
    });

    it("orders nested depth between sibling content", () => {
      expect(blockTypes("> a\n>> b\n> c")).toEqual([
        "blockquote",
        "paragraph",
        "blockquote",
        "paragraph",
        "paragraph",
      ]);
    });

    it("drops a blockquote whose content produces nothing", () => {
      expect(blockTypes("> [!-- c --]")).toEqual([]);
    });

    it("treats a comment-only line as blank", () => {
      expect(blockTypes("> a\n> [!-- c --]\n> b")).toEqual([
        "blockquote",
        "paragraph",
        "paragraph",
      ]);
    });

    it("treats a multi-line comment as blank lines", () => {
      expect(blockTypes("> a\n> [!--\n> c\n> --]\n> b")).toEqual([
        "blockquote",
        "paragraph",
        "paragraph",
      ]);
    });

    it("keeps an unterminated comment literal", () => {
      expect(blockTypes("> a\n> [!--\n> b")).toEqual([
        "blockquote",
        "paragraph",
        "line-break",
        "line-break",
      ]);
    });
  });
});
