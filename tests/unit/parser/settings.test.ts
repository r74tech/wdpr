import { describe, expect, it } from "bun:test";
import { parse, resolveIncludes, createSettings } from "@wdprlib/parser";
import type { Element, SyntaxTree, WikitextSettings } from "@wdprlib/ast";

function getContentElements(doc: SyntaxTree): Element[] {
  return doc.elements.filter((el) => el.element !== "footnote-block");
}

const forumSettings: WikitextSettings = createSettings("forum-post");
const dmSettings: WikitextSettings = createSettings("direct-message");
const pageSettings: WikitextSettings = createSettings("page");
const draftSettings: WikitextSettings = createSettings("draft");

describe("WikitextSettings - Parser", () => {
  describe("enablePageSyntax = true (page mode)", () => {
    it("[[include]] はパースされる", () => {
      const doc = parse("[[include component:box]]", { settings: pageSettings });
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      expect(elements[0]!.element).toBe("include");
    });

    it("[[module Rate]] はパースされる", () => {
      const doc = parse("[[module Rate]]", { settings: pageSettings });
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      expect(elements[0]!.element).toBe("module");
    });

    it("[[toc]] はパースされる", () => {
      const doc = parse("[[toc]]", { settings: pageSettings });
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      expect(elements[0]!.element).toBe("table-of-contents");
    });
  });

  describe("enablePageSyntax = true (draft mode)", () => {
    it("[[include]] はパースされる", () => {
      const doc = parse("[[include component:box]]", { settings: draftSettings });
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      expect(elements[0]!.element).toBe("include");
    });

    it("[[module Rate]] はパースされる", () => {
      const doc = parse("[[module Rate]]", { settings: draftSettings });
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      expect(elements[0]!.element).toBe("module");
    });

    it("[[toc]] はパースされる", () => {
      const doc = parse("[[toc]]", { settings: draftSettings });
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      expect(elements[0]!.element).toBe("table-of-contents");
    });
  });

  describe("enablePageSyntax = false (forum-post mode)", () => {
    it("[[include]] はプレーンテキストになる", () => {
      const doc = parse("[[include component:box]]", { settings: forumSettings });
      const elements = getContentElements(doc);
      // include は認識されず、パラグラフ内のテキストとして扱われる
      expect(elements.every((el) => el.element !== "include")).toBe(true);
    });

    it("[[module Rate]] はプレーンテキストになる", () => {
      const doc = parse("[[module Rate]]", { settings: forumSettings });
      const elements = getContentElements(doc);
      expect(elements.every((el) => el.element !== "module")).toBe(true);
    });

    it("[[toc]] はプレーンテキストになる", () => {
      const doc = parse("[[toc]]", { settings: forumSettings });
      const elements = getContentElements(doc);
      expect(elements.every((el) => el.element !== "table-of-contents")).toBe(true);
    });

    it("[[f<toc]] はプレーンテキストになる", () => {
      const doc = parse("[[f<toc]]", { settings: forumSettings });
      const elements = getContentElements(doc);
      expect(elements.every((el) => el.element !== "table-of-contents")).toBe(true);
    });
  });

  describe("enablePageSyntax = false (direct-message mode)", () => {
    it("[[include]] はプレーンテキストになる", () => {
      const doc = parse("[[include component:box]]", { settings: dmSettings });
      const elements = getContentElements(doc);
      expect(elements.every((el) => el.element !== "include")).toBe(true);
    });

    it("[[module Rate]] はプレーンテキストになる", () => {
      const doc = parse("[[module Rate]]", { settings: dmSettings });
      const elements = getContentElements(doc);
      expect(elements.every((el) => el.element !== "module")).toBe(true);
    });
  });

  describe("settings 未指定時のデフォルト動作", () => {
    it("デフォルトで [[include]] がパースされる (page モード)", () => {
      const doc = parse("[[include component:box]]");
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      expect(elements[0]!.element).toBe("include");
    });

    it("デフォルトで [[module Rate]] がパースされる", () => {
      const doc = parse("[[module Rate]]");
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      expect(elements[0]!.element).toBe("module");
    });

    it("デフォルトで [[toc]] がパースされる", () => {
      const doc = parse("[[toc]]");
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      expect(elements[0]!.element).toBe("table-of-contents");
    });
  });

  describe("resolveIncludes と settings", () => {
    const fetcher = (ref: { page: string }) => `Content of ${ref.page}`;

    it("enablePageSyntax = false のとき展開をスキップする", () => {
      const source = "Before [[include test-page]] After";
      const result = resolveIncludes(source, fetcher, { settings: forumSettings });
      expect(result).toBe(source);
    });

    it("enablePageSyntax = true のとき展開される", () => {
      const source = "Before [[include test-page]] After";
      const result = resolveIncludes(source, fetcher, { settings: pageSettings });
      expect(result).toContain("Content of test-page");
    });

    it("settings 未指定のとき展開される（後方互換）", () => {
      const source = "Before [[include test-page]] After";
      const result = resolveIncludes(source, fetcher);
      expect(result).toContain("Content of test-page");
    });
  });

  describe("page syntax 以外の構文は影響を受けない", () => {
    it("forum-post モードでも太字はパースされる", () => {
      const doc = parse("**bold text**", { settings: forumSettings });
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      // パラグラフ内に bold コンテナが含まれる
      const para = elements[0]!;
      expect(para.element).toBe("container");
    });

    it("forum-post モードでもリンクはパースされる", () => {
      const doc = parse("[[[page-name]]]", { settings: forumSettings });
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
    });

    it("forum-post モードでもコードブロックはパースされる", () => {
      const doc = parse("[[code]]\nfoo\n[[/code]]", { settings: forumSettings });
      const elements = getContentElements(doc);
      expect(elements.some((el) => el.element === "code")).toBe(true);
    });
  });
});
