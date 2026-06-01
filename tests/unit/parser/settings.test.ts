import { describe, expect, it } from "bun:test";
import {
  parse,
  resolveIncludes,
  createSettings,
  Parser,
  tokenize,
  type ParserOptions,
} from "@wdprlib/parser";
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

  describe("allowHtmlBlocks", () => {
    it("createSettings defaults: page=true, others=false", () => {
      expect(pageSettings.allowHtmlBlocks).toBe(true);
      expect(draftSettings.allowHtmlBlocks).toBe(false);
      expect(forumSettings.allowHtmlBlocks).toBe(false);
      expect(dmSettings.allowHtmlBlocks).toBe(false);
    });

    const html = '[[html]]\n<div class="x">hi</div>\n[[/html]]';

    it("parses [[html]] when allowHtmlBlocks is true (page mode)", () => {
      const result = parse(html, { settings: pageSettings });
      const els = getContentElements(result.ast);
      const htmlEl = els.find((el) => el.element === "html");
      expect(htmlEl).toBeDefined();
      expect(result.ast["html-blocks"]).toEqual(['<div class="x">hi</div>']);
      expect(result.diagnostics.some((d) => d.code === "html-block-disabled")).toBe(false);
    });

    it("does NOT emit an html element when disabled, but consumes the whole block", () => {
      const draftAst = parse(html, { settings: draftSettings });
      const els = getContentElements(draftAst.ast);
      expect(els.some((el) => el.element === "html")).toBe(false);
      // No `html-blocks` array (or empty) — the body must not leak as text either.
      expect(draftAst.ast["html-blocks"] ?? []).toEqual([]);
      const allText = JSON.stringify(els);
      expect(allText).not.toContain('<div class="x">hi</div>');
      expect(draftAst.diagnostics.some((d) => d.code === "html-block-disabled")).toBe(true);
    });

    it("disabled + unclosed: consumes to EOF and emits both warnings", () => {
      const unclosed = "[[html]]\n<p>leak?</p>\nno close here";
      const result = parse(unclosed, { settings: draftSettings });
      const els = getContentElements(result.ast);
      expect(els.some((el) => el.element === "html")).toBe(false);
      expect(JSON.stringify(els)).not.toContain("<p>leak?</p>");
      const codes = result.diagnostics.map((d) => d.code);
      expect(codes).toContain("html-block-disabled");
      expect(codes).toContain("unclosed-block");
    });

    it("disabled does not affect surrounding content", () => {
      const src = "before\n\n" + html + "\n\nafter";
      const result = parse(src, { settings: draftSettings });
      const els = getContentElements(result.ast);
      // No html element, but the surrounding paragraphs survive.
      expect(els.some((el) => el.element === "html")).toBe(false);
      const text = JSON.stringify(els);
      expect(text).toContain("before");
      expect(text).toContain("after");
    });

    it("forum-post and direct-message also disable by default", () => {
      for (const settings of [forumSettings, dmSettings]) {
        const result = parse(html, { settings });
        const els = getContentElements(result.ast);
        expect(els.some((el) => el.element === "html")).toBe(false);
        expect(result.diagnostics.some((d) => d.code === "html-block-disabled")).toBe(true);
      }
    });

    it("mid-paragraph [[html]] is stripped too (not just block-position)", () => {
      // The block-rule gate alone misses mid-paragraph occurrences because
      // the block dispatcher never reaches them. The text-level pre-pass
      // catches both positions, so neither the literal `[[html]]` text nor
      // the body appears in the final output.
      const src = "before [[html]]<p>SECRET</p>[[/html]] after";
      const result = parse(src, { settings: draftSettings });
      const text = JSON.stringify(result.ast);
      expect(text).not.toContain("SECRET");
      expect(text).not.toContain("[[html");
      expect(text).toContain("before");
      expect(text).toContain("after");
      expect(result.diagnostics.some((d) => d.code === "html-block-disabled")).toBe(true);
    });

    it("malformed close tag does not leak the body (disabled)", () => {
      // Earlier the rule treated `[[/html` (no `]]`) as a close as soon as
      // the name matched, which would have left the body after it as text.
      // The fix requires `BLOCK_CLOSE` to actually be present.
      const src = "[[html]]\nSECRET\n[[/html no-close\nAFTER";
      const result = parse(src, { settings: draftSettings });
      const text = JSON.stringify(result.ast);
      expect(text).not.toContain("SECRET");
    });

    it("Parser class direct usage also respects the setting", () => {
      // The gate lives in the parse-time rules (block + inline), so it
      // applies regardless of whether callers go through `parse()` or
      // construct `Parser` themselves with pre-lexed tokens.
      const src = "before [[html]]<p>SECRET</p>[[/html]] after";
      const tokens = tokenize(src);
      const result = new Parser(tokens, { settings: draftSettings }).parse();
      const text = JSON.stringify(result.ast);
      expect(text).not.toContain("SECRET");
      expect(result.diagnostics.some((d) => d.code === "html-block-disabled")).toBe(true);
    });

    it("disabled unclosed stops at a blank line, preserving later paragraphs", () => {
      // An unclosed [[html]] used to consume to EOF, eating subsequent
      // paragraphs. The rule now stops at a blank line.
      const src = "before [[html]]SECRET no-close\n\nlater paragraph";
      const result = parse(src, { settings: draftSettings });
      const text = JSON.stringify(result.ast);
      expect(text).not.toContain("SECRET");
      // Tokenisation splits text into multiple elements, so check for
      // the individual words separately.
      expect(text).toContain("later");
      expect(text).toContain("paragraph");
    });

    it("enabled [[html]] with internal blank lines parses normally", () => {
      // Regression: a blank-line stop must NOT apply when html is enabled,
      // since `[[html]]` legitimately contains paragraphs separated by
      // blank lines.
      const src = "[[html]]\n<p>one</p>\n\n<p>two</p>\n[[/html]]";
      const result = parse(src, { settings: pageSettings });
      const els = getContentElements(result.ast);
      const htmlEl = els.find((el) => el.element === "html");
      expect(htmlEl).toBeDefined();
      expect((htmlEl as { data: { contents: string } }).data.contents).toContain("<p>one</p>");
      expect((htmlEl as { data: { contents: string } }).data.contents).toContain("<p>two</p>");
    });

    it("close tag with whitespace before ]] is consumed cleanly", () => {
      // `[[/html ]]` (whitespace before close) was previously detected as
      // a close but the consume side left the trailing `]]` in the text.
      const src = "[[html]]x[[/html ]]\nafter";
      const result = parse(src, { settings: pageSettings });
      const text = JSON.stringify(result.ast);
      expect(text).not.toContain('"]]"');
      expect(text).toContain("after");
    });

    it("inline [[html]] inside [[code]] is not affected (code is raw)", () => {
      // Code blocks store their body as raw text, so the inline rule
      // never sees the [[html]] token — its body is preserved verbatim
      // even when allowHtmlBlocks is false.
      const src = "[[code]]\n[[html]]body[[/html]]\n[[/code]]";
      const result = parse(src, { settings: draftSettings });
      const text = JSON.stringify(result.ast);
      expect(text).toContain("[[html]]body[[/html]]");
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
