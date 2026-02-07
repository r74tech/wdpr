import { describe, expect, it } from "bun:test";
import { renderToHtml, createSettings } from "@wdprlib/render";
import type { SyntaxTree, WikitextSettings } from "@wdprlib/ast";

const forumSettings: WikitextSettings = createSettings("forum-post");
const pageSettings: WikitextSettings = createSettings("page");
const draftSettings: WikitextSettings = createSettings("draft");

describe("WikitextSettings - Renderer", () => {
  describe("allowLocalPaths = false (forum-post mode)", () => {
    it("file1 画像がスキップされる", () => {
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

    it("file2 画像がスキップされる", () => {
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

    it("ローカルパス URL がスキップされる", () => {
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

    it("外部 URL 画像は許可される", () => {
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
    it("file1 画像がレンダリングされる", () => {
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
    it("heading ID が sequential になる", () => {
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

    it("TOC コンテナ ID が固定値になる", () => {
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
    it("heading ID にランダムサフィックスが付く", () => {
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
      // toc0 のあとにランダムサフィックスが付く
      expect(html).toMatch(/id="toc0-[0-9a-f]{6}"/);
    });

    it("TOC コンテナ ID は固定値のまま (runtime 互換)", () => {
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

    it("footnote ID にランダムサフィックスが付く", () => {
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
    it("style が出力されない", () => {
      const tree: SyntaxTree = {
        elements: [],
        styles: ["body { color: red; }"],
      };
      const html = renderToHtml(tree, { settings: draftSettings });
      expect(html).not.toContain("<style>");
      expect(html).not.toContain("body { color: red; }");
    });

    it("forum-post モードでも style が出力されない", () => {
      const tree: SyntaxTree = {
        elements: [],
        styles: [".custom { display: none; }"],
      };
      const html = renderToHtml(tree, { settings: forumSettings });
      expect(html).not.toContain("<style>");
    });
  });

  describe("allowStyleElements = true (page mode)", () => {
    it("style が出力される", () => {
      const tree: SyntaxTree = {
        elements: [],
        styles: ["body { color: red; }"],
      };
      const html = renderToHtml(tree, { settings: pageSettings });
      expect(html).toContain("<style>");
      expect(html).toContain("body { color: red; }");
    });
  });

  describe("settings 未指定時のデフォルト動作", () => {
    it("デフォルトで file1 画像がレンダリングされる (page モード)", () => {
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

    it("デフォルトで style が出力される (page モード)", () => {
      const tree: SyntaxTree = {
        elements: [],
        styles: ["body { color: red; }"],
      };
      const html = renderToHtml(tree);
      expect(html).toContain("<style>");
      expect(html).toContain("body { color: red; }");
    });

    it("デフォルトで heading ID が sequential になる", () => {
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
