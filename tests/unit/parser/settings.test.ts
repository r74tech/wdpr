import { describe, expect, it } from "bun:test";
import { parse, resolveIncludes, createSettings, type ParserOptions } from "@wdprlib/parser";
import type { Element, SyntaxTree, WikitextSettings } from "@wdprlib/ast";

function parseAst(input: string, options?: ParserOptions): SyntaxTree {
  return parse(input, options).ast;
}

function getContentElements(doc: SyntaxTree): Element[] {
  return doc.elements.filter((el) => el.element !== "footnote-block");
}

const forumSettings: WikitextSettings = createSettings("forum-post");
const dmSettings: WikitextSettings = createSettings("direct-message");
const pageSettings: WikitextSettings = createSettings("page");
const draftSettings: WikitextSettings = createSettings("draft");

describe("WikitextSettings - Parser", () => {
  describe("enablePageSyntax = true (page mode)", () => {
    it("parses [[include]]", () => {
      const doc = parseAst("[[include component:box]]", { settings: pageSettings });
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      expect(elements[0]!.element).toBe("include");
    });

    it("parses [[module Rate]]", () => {
      const doc = parseAst("[[module Rate]]", { settings: pageSettings });
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      expect(elements[0]!.element).toBe("module");
    });

    it("parses [[toc]]", () => {
      const doc = parseAst("[[toc]]", { settings: pageSettings });
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      expect(elements[0]!.element).toBe("table-of-contents");
    });
  });

  describe("enablePageSyntax = true (draft mode)", () => {
    it("parses [[include]]", () => {
      const doc = parseAst("[[include component:box]]", { settings: draftSettings });
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      expect(elements[0]!.element).toBe("include");
    });

    it("parses [[module Rate]]", () => {
      const doc = parseAst("[[module Rate]]", { settings: draftSettings });
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      expect(elements[0]!.element).toBe("module");
    });

    it("parses [[toc]]", () => {
      const doc = parseAst("[[toc]]", { settings: draftSettings });
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      expect(elements[0]!.element).toBe("table-of-contents");
    });
  });

  describe("enablePageSyntax = false (forum-post mode)", () => {
    it("treats [[include]] as plain text", () => {
      const doc = parseAst("[[include component:box]]", { settings: forumSettings });
      const elements = getContentElements(doc);
      expect(elements.every((el) => el.element !== "include")).toBe(true);
    });

    it("treats [[module Rate]] as plain text", () => {
      const doc = parseAst("[[module Rate]]", { settings: forumSettings });
      const elements = getContentElements(doc);
      expect(elements.every((el) => el.element !== "module")).toBe(true);
    });

    it("treats [[toc]] as plain text", () => {
      const doc = parseAst("[[toc]]", { settings: forumSettings });
      const elements = getContentElements(doc);
      expect(elements.every((el) => el.element !== "table-of-contents")).toBe(true);
    });

    it("treats [[f<toc]] as plain text", () => {
      const doc = parseAst("[[f<toc]]", { settings: forumSettings });
      const elements = getContentElements(doc);
      expect(elements.every((el) => el.element !== "table-of-contents")).toBe(true);
    });
  });

  describe("enablePageSyntax = false (direct-message mode)", () => {
    it("treats [[include]] as plain text", () => {
      const doc = parseAst("[[include component:box]]", { settings: dmSettings });
      const elements = getContentElements(doc);
      expect(elements.every((el) => el.element !== "include")).toBe(true);
    });

    it("treats [[module Rate]] as plain text", () => {
      const doc = parseAst("[[module Rate]]", { settings: dmSettings });
      const elements = getContentElements(doc);
      expect(elements.every((el) => el.element !== "module")).toBe(true);
    });
  });

  describe("default behavior (no settings specified)", () => {
    it("parses [[include]] by default (page mode)", () => {
      const doc = parseAst("[[include component:box]]");
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      expect(elements[0]!.element).toBe("include");
    });

    it("parses [[module Rate]] by default", () => {
      const doc = parseAst("[[module Rate]]");
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      expect(elements[0]!.element).toBe("module");
    });

    it("parses [[toc]] by default", () => {
      const doc = parseAst("[[toc]]");
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      expect(elements[0]!.element).toBe("table-of-contents");
    });
  });

  describe("resolveIncludes with settings", () => {
    const fetcher = (ref: { page: string }) => `Content of ${ref.page}`;

    it("skips expansion when enablePageSyntax = false", () => {
      const source = "Before\n[[include test-page]]\nAfter";
      const result = resolveIncludes(source, fetcher, { settings: forumSettings });
      expect(result).toBe(source);
    });

    it("expands when enablePageSyntax = true", () => {
      const source = "Before\n[[include test-page]]\nAfter";
      const result = resolveIncludes(source, fetcher, { settings: pageSettings });
      expect(result).toContain("Content of test-page");
    });

    it("expands when settings not specified (backward compat)", () => {
      const source = "Before\n[[include test-page]]\nAfter";
      const result = resolveIncludes(source, fetcher);
      expect(result).toContain("Content of test-page");
    });
  });

  describe("non-page syntax is unaffected", () => {
    it("parses bold in forum-post mode", () => {
      const doc = parseAst("**bold text**", { settings: forumSettings });
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
      const para = elements[0]!;
      expect(para.element).toBe("container");
    });

    it("parses links in forum-post mode", () => {
      const doc = parseAst("[[[page-name]]]", { settings: forumSettings });
      const elements = getContentElements(doc);
      expect(elements.length).toBe(1);
    });

    it("parses code blocks in forum-post mode", () => {
      const doc = parseAst("[[code]]\nfoo\n[[/code]]", { settings: forumSettings });
      const elements = getContentElements(doc);
      expect(elements.some((el) => el.element === "code")).toBe(true);
    });
  });
});
