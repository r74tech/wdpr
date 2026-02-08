import { describe, expect, it } from "bun:test";
import { renderToHtml, createSettings } from "@wdprlib/render";
import type { SyntaxTree, WikitextSettings } from "@wdprlib/ast";

const forumSettings: WikitextSettings = createSettings("forum-post");
const pageSettings: WikitextSettings = createSettings("page");
const draftSettings: WikitextSettings = createSettings("draft");

describe("WikitextSettings - Renderer", () => {
  describe("allowLocalPaths = false (forum-post mode)", () => {
    it("skips file1 images", () => {
      const tree: SyntaxTree = {
        elements: [
          {
            element: "image",
            data: {
              source: { type: "file1", data: { file: "test.png" } },
              attributes: {},
              link: null,
              alignment: null,
            },
          },
        ],
      };
      const html = renderToHtml(tree, {
        settings: forumSettings,
        page: { pageName: "test-page" },
      });
      expect(html).not.toContain("<img");
      expect(html).not.toContain("local--files");
    });

    it("skips file2 images", () => {
      const tree: SyntaxTree = {
        elements: [
          {
            element: "image",
            data: {
              source: { type: "file2", data: { page: "other", file: "test.png" } },
              attributes: {},
              link: null,
              alignment: null,
            },
          },
        ],
      };
      const html = renderToHtml(tree, { settings: forumSettings });
      expect(html).not.toContain("<img");
    });

    it("skips local path URLs", () => {
      const tree: SyntaxTree = {
        elements: [
          {
            element: "image",
            data: {
              source: { type: "url", data: "/local-image.png" },
              attributes: {},
              link: null,
              alignment: null,
            },
          },
        ],
      };
      const html = renderToHtml(tree, { settings: forumSettings });
      expect(html).not.toContain("<img");
    });

    it("allows external URL images", () => {
      const tree: SyntaxTree = {
        elements: [
          {
            element: "image",
            data: {
              source: { type: "url", data: "https://example.com/image.png" },
              attributes: {},
              link: null,
              alignment: null,
            },
          },
        ],
      };
      const html = renderToHtml(tree, { settings: forumSettings });
      expect(html).toContain("<img");
      expect(html).toContain("https://example.com/image.png");
    });
  });

  describe("allowLocalPaths = true (page mode)", () => {
    it("renders file1 images", () => {
      const tree: SyntaxTree = {
        elements: [
          {
            element: "image",
            data: {
              source: { type: "file1", data: { file: "test.png" } },
              attributes: {},
              link: null,
              alignment: null,
            },
          },
        ],
      };
      const html = renderToHtml(tree, {
        settings: pageSettings,
        page: { pageName: "test-page" },
      });
      expect(html).toContain("<img");
      expect(html).toContain("/local--files/test-page/test.png");
    });
  });

  describe("useTrueIds = true (page mode)", () => {
    it("generates sequential heading IDs", () => {
      const tree: SyntaxTree = {
        elements: [
          {
            element: "container",
            data: {
              type: { header: { level: 1, "has-toc": true } },
              attributes: {},
              elements: [{ element: "text", data: "Title" }],
            },
          },
          {
            element: "container",
            data: {
              type: { header: { level: 2, "has-toc": true } },
              attributes: {},
              elements: [{ element: "text", data: "Subtitle" }],
            },
          },
        ],
      };
      const html = renderToHtml(tree, { settings: pageSettings });
      expect(html).toContain('id="toc0"');
      expect(html).toContain('id="toc1"');
    });

    it("generates fixed TOC container IDs", () => {
      const tree: SyntaxTree = {
        elements: [
          {
            element: "table-of-contents",
            data: { attributes: {}, align: null },
          },
        ],
        "table-of-contents": [],
      };
      const html = renderToHtml(tree, { settings: pageSettings });
      expect(html).toContain('id="toc"');
      expect(html).toContain('id="toc-action-bar"');
      expect(html).toContain('id="toc-list"');
    });
  });

  describe("useTrueIds = false (draft mode)", () => {
    it("appends random suffix to heading IDs", () => {
      const tree: SyntaxTree = {
        elements: [
          {
            element: "container",
            data: {
              type: { header: { level: 1, "has-toc": true } },
              attributes: {},
              elements: [{ element: "text", data: "Title" }],
            },
          },
        ],
      };
      const html = renderToHtml(tree, { settings: draftSettings });
      expect(html).toMatch(/id="toc0-[0-9a-f]{6}"/);
    });

    it("keeps TOC container IDs fixed (runtime compat)", () => {
      const tree: SyntaxTree = {
        elements: [
          {
            element: "table-of-contents",
            data: { attributes: {}, align: null },
          },
        ],
        "table-of-contents": [],
      };
      const html = renderToHtml(tree, { settings: draftSettings });
      expect(html).toContain('id="toc"');
      expect(html).toContain('id="toc-action-bar"');
      expect(html).toContain('id="toc-list"');
    });

    it("appends random suffix to footnote IDs", () => {
      const tree: SyntaxTree = {
        elements: [
          {
            element: "footnote-block",
            data: { title: null, hide: false },
          },
        ],
        footnotes: [[{ element: "text", data: "A note" }]],
      };
      const html = renderToHtml(tree, { settings: draftSettings });
      expect(html).toMatch(/id="footnote-1-[0-9a-f]{6}"/);
    });
  });

  describe("allowStyleElements = false (draft mode)", () => {
    it("suppresses style output", () => {
      const tree: SyntaxTree = {
        elements: [],
        styles: ["body { color: red; }"],
      };
      const html = renderToHtml(tree, { settings: draftSettings });
      expect(html).not.toContain("<style>");
      expect(html).not.toContain("body { color: red; }");
    });

    it("suppresses style output in forum-post mode", () => {
      const tree: SyntaxTree = {
        elements: [],
        styles: [".custom { display: none; }"],
      };
      const html = renderToHtml(tree, { settings: forumSettings });
      expect(html).not.toContain("<style>");
    });
  });

  describe("allowStyleElements = true (page mode)", () => {
    it("outputs style elements", () => {
      const tree: SyntaxTree = {
        elements: [],
        styles: ["body { color: red; }"],
      };
      const html = renderToHtml(tree, { settings: pageSettings });
      expect(html).toContain("<style>");
      expect(html).toContain("body { color: red; }");
    });

    it("renders styles inside unresolved iftags (direct child)", () => {
      const tree: SyntaxTree = {
        elements: [
          {
            element: "if-tags",
            data: {
              condition: "+component",
              elements: [{ element: "style", data: ".theme { color: red; }" }],
            },
          },
        ],
      };
      const html = renderToHtml(tree, {
        settings: pageSettings,
        page: { pageName: "test", tags: ["component"] },
      });
      expect(html).toContain("<style>.theme { color: red; }</style>");
    });

    it("renders styles nested inside containers in unresolved iftags", () => {
      const tree: SyntaxTree = {
        elements: [
          {
            element: "if-tags",
            data: {
              condition: "+component",
              elements: [
                {
                  element: "container",
                  data: {
                    type: "div",
                    attributes: {},
                    elements: [{ element: "style", data: ".nested { margin: 0; }" }],
                  },
                },
              ],
            },
          },
        ],
      };
      const html = renderToHtml(tree, {
        settings: pageSettings,
        page: { pageName: "test", tags: ["component"] },
      });
      expect(html).toContain("<style>.nested { margin: 0; }</style>");
    });

    it("does not render styles when iftags condition does not match", () => {
      const tree: SyntaxTree = {
        elements: [
          {
            element: "if-tags",
            data: {
              condition: "+admin",
              elements: [{ element: "style", data: ".admin { color: red; }" }],
            },
          },
        ],
      };
      const html = renderToHtml(tree, {
        settings: pageSettings,
        page: { pageName: "test", tags: ["component"] },
      });
      expect(html).not.toContain("<style>");
    });
  });

  describe("default behavior (no settings specified)", () => {
    it("renders file1 images by default (page mode)", () => {
      const tree: SyntaxTree = {
        elements: [
          {
            element: "image",
            data: {
              source: { type: "file1", data: { file: "test.png" } },
              attributes: {},
              link: null,
              alignment: null,
            },
          },
        ],
      };
      const html = renderToHtml(tree, { page: { pageName: "test-page" } });
      expect(html).toContain("<img");
      expect(html).toContain("/local--files/test-page/test.png");
    });

    it("outputs style elements by default (page mode)", () => {
      const tree: SyntaxTree = {
        elements: [],
        styles: ["body { color: red; }"],
      };
      const html = renderToHtml(tree);
      expect(html).toContain("<style>");
      expect(html).toContain("body { color: red; }");
    });

    it("generates sequential heading IDs by default", () => {
      const tree: SyntaxTree = {
        elements: [
          {
            element: "container",
            data: {
              type: { header: { level: 1, "has-toc": true } },
              attributes: {},
              elements: [{ element: "text", data: "Title" }],
            },
          },
        ],
      };
      const html = renderToHtml(tree);
      expect(html).toContain('id="toc0"');
    });
  });
});
