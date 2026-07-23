import { describe, expect, it } from "bun:test";
import { DEFAULT_SETTINGS, type SyntaxTree, type WikitextPageContext } from "@wdprlib/ast";
import { processWikitext, type PageData } from "@wdprlib/parser";
import { renderWikitext } from "@wdprlib/render";

const page: WikitextPageContext = {
  fullName: "docs:pipeline",
  unixName: "pipeline",
  tags: ["component"],
  urlPath: "/docs:pipeline/offset/0",
};

describe("renderWikitext", () => {
  it("resolves every HTML block asynchronously with matching index, content and page", async () => {
    const source = [
      "[[html]]top[[/html]]",
      '[[module ListPages range="." limit="1"]]',
      "[[html]]pages[[/html]]",
      "[[/module]]",
      '[[module ListUsers users="."]]',
      "[[html]]users[[/html]]",
      "[[/module]]",
    ].join("\n");
    const document = await processWikitext(source, {
      page,
      dataProvider: {
        fetchListPages: async () => ({
          pages: [pageData()],
          totalCount: 1,
          site: { name: "test", title: "Test", domain: "test.example" },
        }),
        fetchListUsers: async () => ({
          user: { number: 1, title: "Alice", name: "alice" },
        }),
      },
    });
    const calls: Array<{ index: number; content: string; page: WikitextPageContext }> = [];

    const result = await renderWikitext(document, {
      resolvers: {
        resolveHtmlBlockUrl: async (input) => {
          calls.push(input);
          return `https://html.example/${input.index}`;
        },
      },
    });

    expect(result.htmlBlocks).toEqual([
      { index: 0, content: "top" },
      { index: 1, content: "pages" },
      { index: 2, content: "users" },
    ]);
    expect(calls).toEqual(result.htmlBlocks.map((block) => ({ ...block, page })));
    expect(result.html).toContain('src="https://html.example/0"');
    expect(result.html).toContain('src="https://html.example/1"');
    expect(result.html).toContain('src="https://html.example/2"');
  });

  it("keeps footnote numbering aligned across top-level and multiple modules", async () => {
    const source = [
      "[[footnote]]top note[[/footnote]]",
      '[[module ListPages range="." limit="1"]]',
      "[[footnote]]pages note[[/footnote]]",
      "[[/module]]",
      '[[module ListUsers users="."]]',
      "[[footnote]]users note[[/footnote]]",
      "[[/module]]",
    ].join("\n");
    const document = await processWikitext(source, {
      page,
      dataProvider: {
        fetchListPages: async () => ({
          pages: [pageData()],
          totalCount: 1,
          site: { name: "test", title: "Test", domain: "test.example" },
        }),
        fetchListUsers: async () => ({
          user: { number: 1, title: "Alice", name: "alice" },
        }),
      },
    });

    const result = await renderWikitext(document);

    expect(result.html).toContain('id="footnoteref-1"');
    expect(result.html).toContain('id="footnoteref-2"');
    expect(result.html).toContain('id="footnoteref-3"');
    expect(result.html).toContain("top note");
    expect(result.html).toContain("pages note");
    expect(result.html).toContain("users note");
  });

  it("bulk-resolves only rendered same-site page targets once", async () => {
    const ast = linkTree();
    const calls: string[][] = [];

    const result = await renderWikitext(
      { ast, page, settings: DEFAULT_SETTINGS },
      {
        resolvers: {
          resolvePageExistence: async (pages) => {
            calls.push(pages);
            return new Set(["exists"]);
          },
        },
      },
    );

    expect(calls).toEqual([["exists", "missing"]]);
    expect(result.html).toContain('href="/exists#section"');
    expect(result.html).toContain('href="/missing" class="newpage"');
    expect(result.html).not.toContain("hidden-target");
  });

  it("separates all emitted styles without leaving style tags in HTML", async () => {
    const ast: SyntaxTree = {
      elements: [
        {
          element: "if-tags",
          data: {
            condition: "+component",
            elements: [{ element: "style", data: ".conditional { color: blue; }" }],
          },
        },
      ],
      styles: [".module { color: red; }"],
    };

    const separate = await renderWikitext(
      { ast, page, settings: DEFAULT_SETTINGS },
      { styleMode: "separate" },
    );
    const inline = await renderWikitext({ ast, page, settings: DEFAULT_SETTINGS });

    expect(separate.styles).toEqual([".conditional { color: blue; }", ".module { color: red; }"]);
    expect(separate.html).not.toContain("<style");
    expect(inline.styles).toEqual(separate.styles);
    expect(inline.html).toContain("<style>");
  });

  it("preserves extra document fields while replacing artifact collisions", async () => {
    const document = {
      ast: { elements: [] } satisfies SyntaxTree,
      page,
      settings: DEFAULT_SETTINGS,
      diagnostics: [{ code: "custom" }],
      html: "stale",
      styles: ["stale"],
      htmlBlocks: [{ index: 99, content: "stale" }],
    };

    const result = await renderWikitext(document);

    expect(result.diagnostics).toEqual([{ code: "custom" }]);
    expect(result.html).toBe("");
    expect(result.styles).toEqual([]);
    expect(result.htmlBlocks).toEqual([]);
  });

  it("rejects when an asynchronous resolver rejects", async () => {
    const ast: SyntaxTree = {
      elements: [{ element: "html", data: { index: 0, contents: "block" } }],
      "html-blocks": ["block"],
    };

    await expect(
      renderWikitext(
        { ast, page, settings: DEFAULT_SETTINGS },
        {
          resolvers: {
            resolveHtmlBlockUrl: async () => {
              throw new Error("R2 failed");
            },
          },
        },
      ),
    ).rejects.toThrow("R2 failed");
  });
});

function pageData(): PageData {
  return {
    name: "generated",
    category: "_default",
    fullname: "generated",
    title: "Generated",
    createdAt: new Date("2026-07-23T00:00:00Z"),
    updatedAt: new Date("2026-07-23T00:00:00Z"),
    tags: [],
    hiddenTags: [],
    children: 0,
    comments: 0,
    size: 0,
    rating: 0,
    ratingVotes: 0,
    revisions: 1,
  };
}

function linkTree(): SyntaxTree {
  return {
    elements: [
      pageLink("exists#section"),
      pageLink("missing"),
      pageLink("missing"),
      pageLink("//special"),
      pageLink("same-name", "other"),
      {
        element: "if-tags",
        data: {
          condition: "+admin",
          elements: [pageLink("hidden-target")],
        },
      },
    ],
  };
}

function pageLink(page: string, site: string | null = null): SyntaxTree["elements"][number] {
  return {
    element: "link",
    data: {
      type: "page",
      link: { site, page },
      extra: null,
      label: "page",
      target: null,
    },
  };
}
