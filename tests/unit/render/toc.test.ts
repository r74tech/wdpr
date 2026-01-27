import { describe, expect, it } from "bun:test";
import { renderTableOfContents } from "../../../packages/render/src/elements/toc";
import { RenderContext } from "../../../packages/render/src/context";
import type { SyntaxTree, Element, ListData, TableOfContentsData } from "@wdpr/ast";

/**
 * Table of Contents Rendering Tests
 *
 * Tests for renderTableOfContents function
 */

// Helper to create empty syntax tree with TOC elements
function createTree(tocElements: Element[] = []): SyntaxTree {
  return {
    elements: [],
    "table-of-contents": tocElements,
    footnotes: [],
    styles: [],
    "html-blocks": [],
    "toc-index": 0,
    "last-label": null,
  };
}

// Helper to create a link element
function link(href: string, text: string): Element {
  return {
    element: "link",
    data: {
      type: "page",
      link: href,
      extra: null,
      label: { text },
      target: null,
    },
  };
}

// Helper to create a list with items containing links
function tocList(items: Array<{ href: string; text: string } | ListData>): Element {
  const listItems = items.map((item) => {
    if ("type" in item) {
      // It's a sub-list
      return {
        "item-type": "sub-list" as const,
        data: item,
      };
    }
    // It's a link item
    return {
      "item-type": "elements" as const,
      elements: [link(item.href, item.text)],
    };
  });

  return {
    element: "list",
    data: {
      type: "bullet",
      items: listItems,
    },
  };
}

// Helper to create nested list data
function subList(items: Array<{ href: string; text: string }>): ListData {
  return {
    type: "bullet",
    items: items.map((item) => ({
      "item-type": "elements" as const,
      elements: [link(item.href, item.text)],
    })),
  };
}

describe("Table of Contents Rendering", () => {
  describe("basic structure", () => {
    it("renders empty TOC with standard structure", () => {
      const tree = createTree([]);
      const ctx = new RenderContext(tree);
      const tocData: TableOfContentsData = {};

      renderTableOfContents(ctx, tocData);
      const output = ctx.getOutput();

      expect(output).toContain('<div id="toc">');
      expect(output).toContain('<div id="toc-action-bar">');
      expect(output).toContain("Fold");
      expect(output).toContain("Unfold");
      expect(output).toContain('<div class="title">Table of Contents</div>');
      expect(output).toContain('<div id="toc-list">');
    });

    it("wraps in table when not floating", () => {
      const tree = createTree([]);
      const ctx = new RenderContext(tree);
      const tocData: TableOfContentsData = {};

      renderTableOfContents(ctx, tocData);
      const output = ctx.getOutput();

      expect(output).toContain("<table");
      expect(output).toContain("</table>");
    });

    it("does not wrap in table when floating left", () => {
      const tree = createTree([]);
      const ctx = new RenderContext(tree);
      const tocData: TableOfContentsData = { align: "left" };

      renderTableOfContents(ctx, tocData);
      const output = ctx.getOutput();

      expect(output).not.toContain("<table");
      expect(output).toContain('class="floatleft"');
    });

    it("does not wrap in table when floating right", () => {
      const tree = createTree([]);
      const ctx = new RenderContext(tree);
      const tocData: TableOfContentsData = { align: "right" };

      renderTableOfContents(ctx, tocData);
      const output = ctx.getOutput();

      expect(output).not.toContain("<table");
      expect(output).toContain('class="floatright"');
    });
  });

  describe("TOC entries", () => {
    it("renders single TOC entry", () => {
      const tree = createTree([tocList([{ href: "#toc1", text: "Section 1" }])]);
      const ctx = new RenderContext(tree);
      const tocData: TableOfContentsData = {};

      renderTableOfContents(ctx, tocData);
      const output = ctx.getOutput();

      expect(output).toContain('href="#toc1"');
      expect(output).toContain("Section 1");
      expect(output).toContain("margin-left: 1em");
    });

    it("renders multiple TOC entries", () => {
      const tree = createTree([
        tocList([
          { href: "#toc1", text: "Section 1" },
          { href: "#toc2", text: "Section 2" },
          { href: "#toc3", text: "Section 3" },
        ]),
      ]);
      const ctx = new RenderContext(tree);
      const tocData: TableOfContentsData = {};

      renderTableOfContents(ctx, tocData);
      const output = ctx.getOutput();

      expect(output).toContain("Section 1");
      expect(output).toContain("Section 2");
      expect(output).toContain("Section 3");
    });

    it("renders nested TOC entries with increasing margin", () => {
      const tree = createTree([
        tocList([
          { href: "#toc1", text: "Section 1" },
          subList([
            { href: "#toc1-1", text: "Subsection 1.1" },
            { href: "#toc1-2", text: "Subsection 1.2" },
          ]),
        ]),
      ]);
      const ctx = new RenderContext(tree);
      const tocData: TableOfContentsData = {};

      renderTableOfContents(ctx, tocData);
      const output = ctx.getOutput();

      expect(output).toContain("Section 1");
      expect(output).toContain("Subsection 1.1");
      expect(output).toContain("Subsection 1.2");
      expect(output).toContain("margin-left: 1em");
      expect(output).toContain("margin-left: 2em");
    });
  });

  describe("HTML escaping", () => {
    it("escapes special characters in href", () => {
      const tree = createTree([
        tocList([{ href: '#toc"><script>alert(1)</script>', text: "Section" }]),
      ]);
      const ctx = new RenderContext(tree);
      const tocData: TableOfContentsData = {};

      renderTableOfContents(ctx, tocData);
      const output = ctx.getOutput();

      expect(output).not.toContain("<script>");
      expect(output).toContain("&lt;script&gt;");
    });

    it("escapes special characters in text", () => {
      const tree = createTree([tocList([{ href: "#toc1", text: "<script>alert(1)</script>" }])]);
      const ctx = new RenderContext(tree);
      const tocData: TableOfContentsData = {};

      renderTableOfContents(ctx, tocData);
      const output = ctx.getOutput();

      expect(output).not.toContain("<script>alert");
      expect(output).toContain("&lt;script&gt;");
    });

    it("escapes ampersands in text", () => {
      const tree = createTree([tocList([{ href: "#toc1", text: "A & B" }])]);
      const ctx = new RenderContext(tree);
      const tocData: TableOfContentsData = {};

      renderTableOfContents(ctx, tocData);
      const output = ctx.getOutput();

      expect(output).toContain("A &amp; B");
    });
  });

  describe("alignment variations", () => {
    it("uses center alignment by default (no float class)", () => {
      const tree = createTree([]);
      const ctx = new RenderContext(tree);
      const tocData: TableOfContentsData = { align: "center" };

      renderTableOfContents(ctx, tocData);
      const output = ctx.getOutput();

      expect(output).not.toContain("floatleft");
      expect(output).not.toContain("floatright");
      expect(output).toContain("<table");
    });

    it("handles undefined align same as center", () => {
      const tree = createTree([]);
      const ctx = new RenderContext(tree);
      const tocData: TableOfContentsData = {};

      renderTableOfContents(ctx, tocData);
      const output = ctx.getOutput();

      expect(output).not.toContain("floatleft");
      expect(output).not.toContain("floatright");
      expect(output).toContain("<table");
    });
  });
});
