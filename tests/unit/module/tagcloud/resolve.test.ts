import { describe, it, expect } from "bun:test";
import { resolveModules } from "../../../../packages/parser/src/parser/rules/block/module/resolve";
import type { SyntaxTree, Element, Module } from "@wdprlib/ast";
import type { DataProvider } from "../../../../packages/parser/src/parser/rules/block/module/types-common";
import type { TagCloudTagData } from "../../../../packages/parser/src/parser/rules/block/module/tagcloud/types";
import { renderToHtml } from "../../../../packages/render/src/index";

function createTagCloudModule(
  overrides: Partial<Extract<Module, { module: "tag-cloud" }>> = {},
): Element {
  return {
    element: "module",
    data: {
      module: "tag-cloud" as const,
      "min-font-size": 100,
      "max-font-size": 300,
      "font-size-unit": "%",
      "min-color": [128, 128, 192],
      "max-color": [64, 64, 128],
      target: "/system:page-tags/tag/",
      limit: 50,
      category: null,
      ...overrides,
    },
  };
}

function createSyntaxTree(elements: Element[]): SyntaxTree {
  return { elements, styles: [] };
}

function simpleParse(input: string): { elements: Element[] } {
  return { elements: [{ element: "text", data: input }] };
}

async function resolveSingle(
  module: Element,
  tags: TagCloudTagData[] | null,
  options: {
    category?: string | null;
    requirement?: { category: string | null; limit: number };
  } = {},
): Promise<SyntaxTree> {
  const dataProvider: DataProvider = {
    fetchTagCloud: () =>
      tags === null ? null : { status: "ok" as const, tags, category: options.category ?? null },
  };
  return await resolveModules(createSyntaxTree([module]), dataProvider, {
    parse: simpleParse,
    compiledListPagesTemplates: new Map(),
    requirements: {
      tagCloud: [{ id: 0, ...(options.requirement ?? { category: null, limit: 50 }) }],
    },
  });
}

function getAnchors(result: SyntaxTree): { href: string; style: string; text: string }[] {
  const box = result.elements[0]!;
  if (box.element !== "container" || box.data.attributes.class !== "pages-tag-cloud-box") {
    throw new Error(`Expected pages-tag-cloud-box, got ${JSON.stringify(box)}`);
  }
  const anchors: { href: string; style: string; text: string }[] = [];
  for (const child of box.data.elements) {
    if (child.element !== "anchor") continue;
    const first = child.data.elements[0];
    anchors.push({
      href: String(child.data.attributes.href),
      style: String(child.data.attributes.style),
      text: first?.element === "text" ? first.data : "",
    });
  }
  return anchors;
}

describe("resolveModules - TagCloud", () => {
  it("interpolates font sizes and colors linearly across the weight range", async () => {
    const result = await resolveSingle(createTagCloudModule(), [
      { tag: "alpha", weight: 1 },
      { tag: "beta", weight: 2 },
      { tag: "gamma", weight: 3 },
    ]);

    const anchors = getAnchors(result);
    expect(anchors.map((a) => a.text)).toEqual(["alpha", "beta", "gamma"]);
    expect(anchors[0]!.style).toBe("font-size: 100%; color: rgb(128, 128, 192);");
    expect(anchors[1]!.style).toBe("font-size: 200%; color: rgb(96, 96, 160);");
    expect(anchors[2]!.style).toBe("font-size: 300%; color: rgb(64, 64, 128);");
  });

  it("uses the minimum size and color for all tags when the weight range is zero", async () => {
    const result = await resolveSingle(createTagCloudModule(), [
      { tag: "a", weight: 7 },
      { tag: "b", weight: 7 },
    ]);

    for (const anchor of getAnchors(result)) {
      expect(anchor.style).toBe("font-size: 100%; color: rgb(128, 128, 192);");
    }
  });

  it("honors custom font sizes, units, and colors", async () => {
    const result = await resolveSingle(
      createTagCloudModule({
        "min-font-size": 8,
        "max-font-size": 20,
        "font-size-unit": "px",
        "min-color": [200, 200, 200],
        "max-color": [0, 0, 0],
      }),
      [
        { tag: "small", weight: 1 },
        { tag: "big", weight: 2 },
      ],
    );

    const anchors = getAnchors(result);
    expect(anchors[0]!.text).toBe("big");
    expect(anchors[0]!.style).toBe("font-size: 20px; color: rgb(0, 0, 0);");
    expect(anchors[1]!.style).toBe("font-size: 8px; color: rgb(200, 200, 200);");
  });

  it("selects top tags by weight then displays them alphabetically", async () => {
    const result = await resolveSingle(
      createTagCloudModule({ limit: 2 }),
      [
        { tag: "zeta", weight: 5 },
        { tag: "alpha", weight: 1 },
        { tag: "mid", weight: 3 },
      ],
      { requirement: { category: null, limit: 2 } },
    );

    expect(getAnchors(result).map((a) => a.text)).toEqual(["mid", "zeta"]);
  });

  it("breaks weight ties deterministically by tag name at the limit boundary", async () => {
    const tags = [
      { tag: "ccc", weight: 2 },
      { tag: "aaa", weight: 2 },
      { tag: "bbb", weight: 2 },
    ];
    const result = await resolveSingle(createTagCloudModule({ limit: 2 }), tags);
    const shuffled = await resolveSingle(createTagCloudModule({ limit: 2 }), [...tags].reverse());

    expect(getAnchors(result).map((a) => a.text)).toEqual(["aaa", "bbb"]);
    expect(getAnchors(shuffled).map((a) => a.text)).toEqual(["aaa", "bbb"]);
  });

  it("orders non-ASCII tags by code point regardless of locale", async () => {
    const result = await resolveSingle(createTagCloudModule(), [
      { tag: "ん", weight: 1 },
      { tag: "あ", weight: 1 },
      { tag: "zzz", weight: 1 },
    ]);

    expect(getAnchors(result).map((a) => a.text)).toEqual(["zzz", "あ", "ん"]);
  });

  it("encodes tag names in hrefs like PHP's rawurlencode", async () => {
    const result = await resolveSingle(createTagCloudModule(), [
      { tag: "hello world", weight: 1 },
      { tag: "日本語", weight: 1 },
      { tag: "it's*(ok)!", weight: 1 },
    ]);

    const hrefs = getAnchors(result).map((a) => a.href);
    expect(hrefs).toContain("/system:page-tags/tag/hello%20world");
    expect(hrefs).toContain("/system:page-tags/tag/%E6%97%A5%E6%9C%AC%E8%AA%9E");
    expect(hrefs).toContain("/system:page-tags/tag/it%27s%2A%28ok%29%21");
  });

  it("appends the fetcher's normalized category to hrefs", async () => {
    const result = await resolveSingle(
      createTagCloudModule({ category: "News Foo" }),
      [{ tag: "a", weight: 1 }],
      { category: "news-foo", requirement: { category: "News Foo", limit: 50 } },
    );

    expect(getAnchors(result)[0]!.href).toBe("/system:page-tags/tag/a/category/news-foo");
  });

  it("renders Wikidot's no-tags paragraph when the fetcher returns zero tags", async () => {
    const result = await resolveSingle(createTagCloudModule(), []);

    const html = renderToHtml(result);
    expect(html).toBe(
      "<p>It seems you have no tags attached to pages. To attach a tag simply click on the " +
        "<em>tags</em> button at the bottom of any page.</p>",
    );
  });

  it("renders an error block when the category is not found", async () => {
    const dataProvider: DataProvider = {
      fetchTagCloud: () => ({ status: "category-not-found" as const, category: "nope" }),
    };
    const result = await resolveModules(
      createSyntaxTree([createTagCloudModule({ category: "nope" })]),
      dataProvider,
      {
        parse: simpleParse,
        compiledListPagesTemplates: new Map(),
        requirements: { tagCloud: [{ id: 0, category: "nope", limit: 50 }] },
      },
    );

    expect(renderToHtml(result)).toBe(
      '<div class="error-block">Category "nope" can not be found.</div>',
    );
  });

  it("outputs nothing when the fetcher returns null", async () => {
    const result = await resolveSingle(createTagCloudModule(), null);
    expect(result.elements).toEqual([]);
  });

  it("keeps the module element when no fetcher is provided", async () => {
    const module = createTagCloudModule();
    const result = await resolveModules(
      createSyntaxTree([module]),
      {},
      {
        parse: simpleParse,
        compiledListPagesTemplates: new Map(),
        requirements: { tagCloud: [{ id: 0, category: null, limit: 50 }] },
      },
    );

    expect(result.elements).toEqual([module]);
  });

  it("keeps requirement IDs aligned across non-matching iftags blocks", async () => {
    const fetched: number[] = [];
    const dataProvider: DataProvider = {
      getPageTags: () => ["visible"],
      fetchTagCloud: (req) => {
        fetched.push(req.id);
        return {
          status: "ok" as const,
          tags: [{ tag: `tag${req.id}`, weight: 1 }],
          category: null,
        };
      },
    };
    const hidden: Element = {
      element: "if-tags",
      data: {
        condition: "+hidden",
        elements: [createTagCloudModule()],
      },
    };
    const result = await resolveModules(
      createSyntaxTree([hidden, createTagCloudModule()]),
      dataProvider,
      {
        parse: simpleParse,
        compiledListPagesTemplates: new Map(),
        requirements: {
          tagCloud: [
            { id: 0, category: null, limit: 50 },
            { id: 1, category: null, limit: 50 },
          ],
        },
      },
    );

    // The iftags block does not match, so only the second module (id 1) renders.
    expect(getAnchors(result).map((a) => a.text)).toEqual(["tag1"]);
  });

  it("renders resolved output as Wikidot-compatible HTML with whitespace between anchors", async () => {
    const result = await resolveSingle(createTagCloudModule(), [
      { tag: "alpha", weight: 1 },
      { tag: "beta", weight: 3 },
    ]);

    // The renderer reorders attributes and drops the space after style
    // semicolons; both are CSS/HTML-equivalent to Wikidot's output.
    const html = renderToHtml(result);
    expect(html).toBe(
      '<div class="pages-tag-cloud-box">\n' +
        '<a href="/system:page-tags/tag/alpha" class="tag" ' +
        'style="font-size: 100%;color: rgb(128, 128, 192);">alpha</a>\n' +
        '<a href="/system:page-tags/tag/beta" class="tag" ' +
        'style="font-size: 300%;color: rgb(64, 64, 128);">beta</a>\n' +
        "</div>",
    );
  });
});
