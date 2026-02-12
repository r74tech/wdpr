import { describe, expect, it } from "bun:test";
import { parse, type ParserOptions } from "@wdprlib/parser";
import type { Element, SyntaxTree } from "@wdprlib/ast";

function parseAst(input: string, options?: ParserOptions): SyntaxTree {
  return parse(input, options).ast;
}

/**
 * Line Break Unit Tests
 *
 * 厳格なルール:
 * 1. 期待するAST構造を検証（line-breakの有無と位置）
 * 2. テキストノードは分割されるため、テキスト全体ではなく構造を検証
 * 3. fixtureでカバー済みのケースは重複しない
 *
 * fixtureでカバー済み: tests/fixtures/line-breaks/basic/
 */

function getContentElements(doc: SyntaxTree): Element[] {
  return doc.elements.filter((el) => el.element !== "footnote-block");
}

// 要素配列からline-breakの位置（インデックス）を取得
function getLineBreakIndices(elements: Element[]): number[] {
  return elements.map((el, i) => (el.element === "line-break" ? i : -1)).filter((i) => i !== -1);
}

// 要素配列からテキストを結合
function collectText(elements: Element[]): string {
  return elements
    .filter((el) => el.element === "text")
    .map((el) => (el as { element: "text"; data: string }).data)
    .join("");
}

describe("Line Break", () => {
  describe("single newline within paragraph", () => {
    it("inserts line-break between text nodes for single newline", () => {
      const doc = parseAst("line1\nline2");
      const content = getContentElements(doc);

      expect(content).toHaveLength(1);
      expect(content[0]).toMatchObject({
        element: "container",
        data: { type: "paragraph" },
      });

      const elements = (content[0] as { data: { elements: Element[] } }).data.elements;
      expect(collectText(elements)).toBe("line1line2");
      expect(getLineBreakIndices(elements)).toEqual([1]); // line-breakは2番目の位置
    });

    it("inserts multiple line-breaks for multiple newlines", () => {
      const doc = parseAst("line1\nline2\nline3");
      const content = getContentElements(doc);

      expect(content).toHaveLength(1);
      const elements = (content[0] as { data: { elements: Element[] } }).data.elements;
      expect(collectText(elements)).toBe("line1line2line3");

      const lineBreakIndices = getLineBreakIndices(elements);
      expect(lineBreakIndices).toHaveLength(2);
    });
  });

  describe("blank line creates new paragraph", () => {
    it("creates separate paragraphs for blank line", () => {
      const doc = parseAst("paragraph1\n\nparagraph2");
      const content = getContentElements(doc);

      expect(content).toHaveLength(2);
      expect(content[0]).toMatchObject({ element: "container", data: { type: "paragraph" } });
      expect(content[1]).toMatchObject({ element: "container", data: { type: "paragraph" } });

      const elements1 = (content[0] as { data: { elements: Element[] } }).data.elements;
      const elements2 = (content[1] as { data: { elements: Element[] } }).data.elements;

      expect(collectText(elements1)).toBe("paragraph1");
      expect(collectText(elements2)).toBe("paragraph2");

      // Neither paragraph should have line-break
      expect(getLineBreakIndices(elements1)).toEqual([]);
      expect(getLineBreakIndices(elements2)).toEqual([]);
    });
  });

  describe("no line-break before block elements", () => {
    it("paragraph ends without line-break when followed by list", () => {
      const doc = parseAst("text\n* item");
      const content = getContentElements(doc);

      expect(content).toHaveLength(2);
      expect(content[0]).toMatchObject({ element: "container", data: { type: "paragraph" } });
      expect(content[1]).toMatchObject({ element: "list" });

      // Paragraph should NOT have line-break
      const elements = (content[0] as { data: { elements: Element[] } }).data.elements;
      expect(getLineBreakIndices(elements)).toEqual([]);
    });

    it("paragraph ends without line-break when followed by heading", () => {
      const doc = parseAst("text\n+ Heading");
      const content = getContentElements(doc);

      expect(content).toHaveLength(2);
      expect(content[0]).toMatchObject({ element: "container", data: { type: "paragraph" } });
      expect(content[1]).toMatchObject({
        element: "container",
        data: { type: { header: { level: 1 } } },
      });

      const elements = (content[0] as { data: { elements: Element[] } }).data.elements;
      expect(getLineBreakIndices(elements)).toEqual([]);
    });

    it("paragraph ends without line-break when followed by blockquote", () => {
      const doc = parseAst("text\n> quoted");
      const content = getContentElements(doc);

      expect(content).toHaveLength(2);
      expect(content[0]).toMatchObject({ element: "container", data: { type: "paragraph" } });
      expect(content[1]).toMatchObject({ element: "container", data: { type: "blockquote" } });

      const elements = (content[0] as { data: { elements: Element[] } }).data.elements;
      expect(getLineBreakIndices(elements)).toEqual([]);
    });

    it("paragraph ends without line-break when followed by horizontal rule", () => {
      const doc = parseAst("text\n----");
      const content = getContentElements(doc);

      expect(content).toHaveLength(2);
      expect(content[0]).toMatchObject({ element: "container", data: { type: "paragraph" } });
      expect(content[1]).toMatchObject({ element: "horizontal-rule" });

      const elements = (content[0] as { data: { elements: Element[] } }).data.elements;
      expect(getLineBreakIndices(elements)).toEqual([]);
    });

    it("paragraph ends without line-break when followed by table", () => {
      const doc = parseAst("text\n|| cell ||");
      const content = getContentElements(doc);

      expect(content).toHaveLength(2);
      expect(content[0]).toMatchObject({ element: "container", data: { type: "paragraph" } });
      expect(content[1]).toMatchObject({ element: "table" });

      const elements = (content[0] as { data: { elements: Element[] } }).data.elements;
      expect(getLineBreakIndices(elements)).toEqual([]);
    });
  });

  describe("combined cases", () => {
    it("handles line-breaks within paragraph followed by block element", () => {
      const doc = parseAst("line1\nline2\n* item\n\nnewpara");
      const content = getContentElements(doc);

      expect(content).toHaveLength(3);

      // First paragraph has line-break
      const para1 = (content[0] as { data: { elements: Element[] } }).data.elements;
      expect(collectText(para1)).toBe("line1line2");
      expect(getLineBreakIndices(para1)).toHaveLength(1);

      // List
      expect(content[1]).toMatchObject({ element: "list" });

      // Second paragraph without line-break
      const para2 = (content[2] as { data: { elements: Element[] } }).data.elements;
      expect(collectText(para2)).toBe("newpara");
      expect(getLineBreakIndices(para2)).toEqual([]);
    });
  });
});
