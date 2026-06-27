import { describe, expect, it } from "bun:test";
import { RenderContext } from "../../../packages/render/src/context";
import type { SyntaxTree, ImageSource, LinkLocation } from "@wdprlib/ast";

describe("RenderContext", () => {
  function createEmptyTree(): SyntaxTree {
    return { elements: [] };
  }

  describe("constructor", () => {
    it("should initialize with empty tree", () => {
      const ctx = new RenderContext(createEmptyTree());
      expect(ctx.footnotes).toEqual([]);
      expect(ctx.styles).toEqual([]);
      expect(ctx.htmlBlocks).toEqual([]);
      expect(ctx.tocElements).toEqual([]);
    });

    it("should use tree data when available", () => {
      const tree: SyntaxTree = {
        elements: [],
        footnotes: [[{ element: "text", data: "note" }]],
        styles: ["body { color: red; }"],
        "html-blocks": ["<p>html</p>"],
        "table-of-contents": [
          { element: "list", data: { type: "bullet", attributes: {}, items: [] } },
        ],
      };
      const ctx = new RenderContext(tree);

      // Verify length and content
      expect(ctx.footnotes.length).toBe(1);
      expect(ctx.footnotes[0]?.[0]?.data).toBe("note");
      expect(ctx.styles.length).toBe(1);
      expect(ctx.styles[0]).toBe("body { color: red; }");
      expect(ctx.htmlBlocks.length).toBe(1);
      expect(ctx.htmlBlocks[0]).toBe("<p>html</p>");
      expect(ctx.tocElements.length).toBe(1);
      expect(ctx.tocElements[0]?.element).toBe("list");
    });

    it("should override footnotes with options", () => {
      const tree: SyntaxTree = {
        elements: [],
        footnotes: [[{ element: "text", data: "tree-note" }]],
      };
      const ctx = new RenderContext(tree, {
        footnotes: [[{ element: "text", data: "option-note" }]],
      });

      // Options should take precedence over tree data
      expect(ctx.footnotes[0]?.[0]?.data).toBe("option-note");
    });
  });

  describe("push / pushEscaped / getOutput", () => {
    it("should accumulate HTML", () => {
      const ctx = new RenderContext(createEmptyTree());
      ctx.push("<div>");
      ctx.push("content");
      ctx.push("</div>");

      expect(ctx.getOutput()).toBe("<div>content</div>");
    });

    it("should escape text with pushEscaped", () => {
      const ctx = new RenderContext(createEmptyTree());
      ctx.pushEscaped("<script>");

      expect(ctx.getOutput()).toBe("&lt;script&gt;");
    });

    it("should not escape with push", () => {
      const ctx = new RenderContext(createEmptyTree());
      ctx.push("<div>");

      expect(ctx.getOutput()).toBe("<div>");
    });
  });

  describe("index management", () => {
    it("should increment TOC index", () => {
      const ctx = new RenderContext(createEmptyTree());
      expect(ctx.nextTocIndex()).toBe(0);
      expect(ctx.nextTocIndex()).toBe(1);
      expect(ctx.nextTocIndex()).toBe(2);
    });

    it("should increment footnote index", () => {
      const ctx = new RenderContext(createEmptyTree());
      expect(ctx.nextFootnoteIndex()).toBe(0);
      expect(ctx.nextFootnoteIndex()).toBe(1);
    });

    it("should increment equation index", () => {
      const ctx = new RenderContext(createEmptyTree());
      expect(ctx.nextEquationIndex()).toBe(0);
      expect(ctx.nextEquationIndex()).toBe(1);
    });

    it("should increment htmlBlock index", () => {
      const ctx = new RenderContext(createEmptyTree());
      expect(ctx.nextHtmlBlockIndex()).toBe(0);
      expect(ctx.nextHtmlBlockIndex()).toBe(1);
    });

    it("should maintain separate indices", () => {
      const ctx = new RenderContext(createEmptyTree());
      expect(ctx.nextTocIndex()).toBe(0);
      expect(ctx.nextFootnoteIndex()).toBe(0);
      expect(ctx.nextEquationIndex()).toBe(0);
      expect(ctx.nextHtmlBlockIndex()).toBe(0);

      // Each should still be at 1 after one call
      expect(ctx.nextTocIndex()).toBe(1);
      expect(ctx.nextFootnoteIndex()).toBe(1);
    });
  });

  describe("resolveImageSource", () => {
    it("should resolve URL type", () => {
      const ctx = new RenderContext(createEmptyTree());
      const source: ImageSource = { type: "url", data: "https://example.com/img.png" };

      expect(ctx.resolveImageSource(source)).toBe("https://example.com/img.png");
    });

    it("should resolve file1 type", () => {
      const ctx = new RenderContext(createEmptyTree());
      const source: ImageSource = { type: "file1", data: { file: "image.png" } };

      expect(ctx.resolveImageSource(source)).toBe("/local--files/image.png");
    });

    it("should resolve file2 type", () => {
      const ctx = new RenderContext(createEmptyTree());
      const source: ImageSource = {
        type: "file2",
        data: { page: "test-page", file: "image.png" },
      };

      expect(ctx.resolveImageSource(source)).toBe("/local--files/test-page/image.png");
    });

    it("should resolve file3 type", () => {
      const ctx = new RenderContext(createEmptyTree());
      const source: ImageSource = {
        type: "file3",
        data: { site: "my-site", page: "test-page", file: "image.png" },
      };

      expect(ctx.resolveImageSource(source)).toBe("/local--files/my-site/test-page/image.png");
    });
  });

  describe("resolvePageLink", () => {
    it("should resolve string link", () => {
      const ctx = new RenderContext(createEmptyTree());
      const link: LinkLocation = "https://example.com";

      expect(ctx.resolvePageLink(link)).toBe("https://example.com");
    });

    it("should resolve PageRef without site", () => {
      const ctx = new RenderContext(createEmptyTree());
      const link: LinkLocation = { page: "test-page" };

      expect(ctx.resolvePageLink(link)).toBe("/test-page");
    });

    it("should resolve PageRef with site", () => {
      const ctx = new RenderContext(createEmptyTree());
      const link: LinkLocation = { page: "test-page", site: "other-site" };

      expect(ctx.resolvePageLink(link)).toBe("/other-site/test-page");
    });

    it("should resolve PageRef with configured site domain", () => {
      const ctx = new RenderContext(createEmptyTree(), {
        page: {
          pageName: "test-page",
          siteDomains: { "other-site": "other-site.example.com" },
        },
      });
      const link: LinkLocation = { page: "test-page", site: "other-site" };

      expect(ctx.resolvePageLink(link)).toBe("https://other-site.example.com/test-page");
    });
  });

  describe("renderAttributes", () => {
    it("should render safe attributes", () => {
      const ctx = new RenderContext(createEmptyTree());
      const result = ctx.renderAttributes({ class: "test", id: "my-id" });

      expect(result).toContain('class="test"');
      expect(result).toContain('id="my-id"');
    });

    it("should remove dangerous attributes", () => {
      const ctx = new RenderContext(createEmptyTree());
      const result = ctx.renderAttributes({ onclick: "alert(1)", class: "safe" });

      expect(result).not.toContain("onclick");
      expect(result).toContain('class="safe"');
    });

    it("should escape attribute values", () => {
      const ctx = new RenderContext(createEmptyTree());
      const result = ctx.renderAttributes({ title: 'Test "quote"' });

      expect(result).toContain('title="Test &quot;quote&quot;"');
    });

    it("should handle empty attribute values", () => {
      const ctx = new RenderContext(createEmptyTree());
      const result = ctx.renderAttributes({ disabled: "" });

      expect(result).toBe(' disabled=""');
    });

    it("should return empty string for empty attributes", () => {
      const ctx = new RenderContext(createEmptyTree());
      const result = ctx.renderAttributes({});

      expect(result).toBe("");
    });
  });

  describe("page context", () => {
    it("should return undefined when no page context", () => {
      const ctx = new RenderContext(createEmptyTree());

      expect(ctx.page).toBeUndefined();
    });

    it("should return page context from options", () => {
      const ctx = new RenderContext(createEmptyTree(), {
        page: { pageName: "test-page" },
      });

      expect(ctx.page).toEqual({ pageName: "test-page" });
    });
  });
});
