import { describe, expect, it } from "bun:test";
import {
  DEFAULT_SETTINGS,
  STYLE_SLOT_PREFIX,
  type Element,
  type SyntaxTree,
  type WikitextPageContext,
} from "@wdprlib/ast";
import { processWikitext, type PageData } from "@wdprlib/parser";
import { renderWikitext } from "@wdprlib/render";

const page: WikitextPageContext = {
  fullName: "docs:pipeline",
  unixName: "pipeline",
  tags: ["component"],
  urlPath: "/docs:pipeline/offset/0",
};

describe("renderWikitext", () => {
  it("renders one million plain-text characters without asynchronous dependencies", async () => {
    const text = "あ".repeat(1_000_000);

    const result = await renderWikitext({
      ast: { elements: [{ element: "text", data: text }] },
      page,
      settings: DEFAULT_SETTINGS,
    });

    expect(result.html).toBe(text);
    expect(result.styles).toEqual([]);
    expect(result.htmlBlocks).toEqual([]);
  });

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

  it("keeps local page links marked as new pages when the resolver is omitted", async () => {
    const result = await renderWikitext({
      ast: { elements: [pageLink("missing#section")] },
      page,
      settings: DEFAULT_SETTINGS,
    });

    expect(result.html).toContain('href="/missing#section" class="newpage"');
  });

  it("keeps the default HTML block URL when the asynchronous resolver is omitted", async () => {
    const result = await renderWikitext({
      ast: { elements: [htmlBlock("default block")] },
      page,
      settings: DEFAULT_SETTINGS,
    });

    expect(result.htmlBlocks).toEqual([{ index: 0, content: "default block" }]);
    expect(result.html).toMatch(/src="\/docs:pipeline\/html\/[a-f0-9]{40}-[0-9]+"/);
  });

  it("calls the user resolver once after asynchronous resolvers", async () => {
    const events: string[] = [];
    const ast: SyntaxTree = {
      elements: [user("alice"), pageLink("existing"), htmlBlock("custom block")],
    };

    const result = await renderWikitext(
      { ast, page, settings: DEFAULT_SETTINGS },
      {
        resolvers: {
          resolvePageExistence: async () => {
            events.push("page");
            return new Set(["existing"]);
          },
          resolveHtmlBlockUrl: async () => {
            events.push("html");
            return "https://html.example/custom";
          },
          user: (username) => {
            events.push(`user:${username}`);
            return { name: "Alice", url: "/user/alice" };
          },
        },
      },
    );

    expect(events).toEqual(["page", "html", "user:alice"]);
    expect(result.html).toContain('<a href="/user/alice">Alice</a>');
    expect(result.html).toContain('src="https://html.example/custom"');
  });

  it("does not call the page existence resolver without page links", async () => {
    let calls = 0;
    const document = {
      ast: { elements: [{ element: "text", data: "plain text" }] } satisfies SyntaxTree,
      page,
      settings: DEFAULT_SETTINGS,
    };

    const withResolver = await renderWikitext(document, {
      resolvers: {
        resolvePageExistence: async () => {
          calls++;
          return new Set();
        },
      },
    });
    const withoutResolver = await renderWikitext(document);

    expect(calls).toBe(0);
    expect(withResolver.html).toBe(withoutResolver.html);
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

    const trustedStyleSettings = { ...DEFAULT_SETTINGS, allowStyleElements: true };
    const separate = await renderWikitext(
      { ast, page, settings: trustedStyleSettings },
      { styleMode: "separate" },
    );
    const inline = await renderWikitext({ ast, page, settings: trustedStyleSettings });

    expect(separate.styles).toEqual([".conditional { color: blue; }", ".module { color: red; }"]);
    expect(separate.html).not.toContain("<style");
    expect(inline.styles).toEqual(separate.styles);
    expect(inline.html).toContain("<style>");
  });

  it("preserves the CSS order around an IfTags style slot", async () => {
    const ast: SyntaxTree = {
      elements: [
        {
          element: "if-tags",
          data: {
            condition: "+component",
            elements: [{ element: "style", data: ".conditional { color: blue; }" }],
            _styleSlot: 0,
          },
        },
      ],
      styles: [".before { color: red; }", `${STYLE_SLOT_PREFIX}0`, ".after { color: green; }"],
    };
    const settings = { ...DEFAULT_SETTINGS, allowStyleElements: true };

    const separate = await renderWikitext({ ast, page, settings }, { styleMode: "separate" });
    const inline = await renderWikitext({ ast, page, settings });

    expect(separate.styles).toEqual([
      ".before { color: red; }",
      ".conditional { color: blue; }",
      ".after { color: green; }",
    ]);
    expect(inline.styles).toEqual(separate.styles);
    expect(inline.html.indexOf(".before")).toBeLessThan(inline.html.indexOf(".conditional"));
    expect(inline.html.indexOf(".conditional")).toBeLessThan(inline.html.indexOf(".after"));
  });

  it("collects dependencies from every rendered nested element path", async () => {
    const ast = nestedDependencyTree();
    const pageCalls: string[][] = [];
    const htmlCalls: Array<{ index: number; content: string }> = [];

    const result = await renderWikitext(
      { ast, page, settings: { ...DEFAULT_SETTINGS, useTrueIds: true } },
      {
        resolvers: {
          resolvePageExistence: async (pages) => {
            pageCalls.push(pages);
            return new Set(pages);
          },
          resolveHtmlBlockUrl: async ({ index, content }) => {
            htmlCalls.push({ index, content });
            return `https://html.example/${content}`;
          },
        },
      },
    );

    const renderedNames = [
      "list",
      "table",
      "tab",
      "include",
      "if",
      "ifexpr",
      "bibliography",
      "footnote",
    ];
    expect(pageCalls).toEqual([renderedNames.map((name) => `${name}-page`)]);
    expect(htmlCalls).toEqual(
      renderedNames.map((name, index) => ({ index, content: `${name}-html` })),
    );
    expect(result.htmlBlocks).toEqual(htmlCalls);
    for (const name of renderedNames) {
      expect(result.html).toContain(`https://html.example/${name}-html`);
    }
    expect(result.html).not.toContain("hidden-page");
    expect(result.htmlBlocks).not.toContainEqual({ index: 8, content: "hidden-html" });
  });

  it("suppresses untrusted styles in inline and separate modes by default", async () => {
    const ast: SyntaxTree = {
      elements: [{ element: "style", data: ".inline { color: red; }" }],
      styles: [".module { color: blue; }"],
    };

    const inline = await renderWikitext({ ast, page, settings: DEFAULT_SETTINGS });
    const separate = await renderWikitext(
      { ast, page, settings: DEFAULT_SETTINGS },
      { styleMode: "separate" },
    );

    expect(inline.html).not.toContain("<style");
    expect(inline.styles).toEqual([]);
    expect(separate.html).not.toContain("<style");
    expect(separate.styles).toEqual([]);
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
      elements: [user("alice"), htmlBlock("block")],
      "html-blocks": ["block"],
    };
    let userCalls = 0;

    await expect(
      renderWikitext(
        { ast, page, settings: DEFAULT_SETTINGS },
        {
          resolvers: {
            resolveHtmlBlockUrl: async () => {
              throw new Error("R2 failed");
            },
            user: () => {
              userCalls++;
              return null;
            },
          },
        },
      ),
    ).rejects.toThrow("R2 failed");
    expect(userCalls).toBe(0);
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

function htmlBlock(contents: string): Element {
  return { element: "html", data: { contents } };
}

function user(name: string): Element {
  return { element: "user", data: { name, "show-avatar": false } };
}

function dependencyPair(name: string): Element[] {
  return [pageLink(`${name}-page`), htmlBlock(`${name}-html`)];
}

function nestedDependencyTree(): SyntaxTree {
  const hidden = dependencyPair("hidden");
  return {
    elements: [
      {
        element: "list",
        data: {
          type: "bullet",
          attributes: {},
          items: [{ "item-type": "elements", attributes: {}, elements: dependencyPair("list") }],
        },
      },
      {
        element: "table",
        data: {
          attributes: {},
          rows: [
            {
              attributes: {},
              cells: [
                {
                  header: false,
                  "column-span": 1,
                  align: null,
                  attributes: {},
                  elements: dependencyPair("table"),
                },
              ],
            },
          ],
        },
      },
      { element: "tab-view", data: [{ label: "Tab", elements: dependencyPair("tab") }] },
      {
        element: "include",
        data: {
          "paragraph-safe": false,
          variables: {},
          location: { site: null, page: "resolved" },
          elements: dependencyPair("include"),
        },
      },
      {
        element: "if",
        data: {
          condition: "true",
          // oxlint-disable-next-line unicorn/no-thenable -- `then` is part of the public AST schema
          then: dependencyPair("if"),
          else: hidden,
        },
      },
      {
        element: "ifexpr",
        data: {
          expression: "1",
          // oxlint-disable-next-line unicorn/no-thenable -- `then` is part of the public AST schema
          then: dependencyPair("ifexpr"),
          else: hidden,
        },
      },
      {
        element: "bibliography-block",
        data: {
          title: null,
          hide: false,
          entries: [
            {
              key_string: "nested",
              key: hidden,
              value: dependencyPair("bibliography"),
            },
          ],
        },
      },
      { element: "footnote-block", data: { title: null, hide: false } },
    ],
    footnotes: [dependencyPair("footnote")],
  };
}
