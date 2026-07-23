import { describe, expect, it } from "bun:test";
import { resolveModules } from "../../../../packages/parser/src/parser/rules/block/module/resolve";
import { compileTemplate } from "../../../../packages/parser/src/parser/rules/block/module/listpages/compiler";
import { STYLE_SLOT_PREFIX, type Element, type SyntaxTree, type Module } from "@wdprlib/ast";
import type { DataProvider } from "../../../../packages/parser/src/parser/rules/block/module/types-common";
import type {
  ListPagesDataRequirement,
  ListPagesExternalData,
  PageData,
  SiteContext,
  CompiledTemplate,
  NormalizedListPagesQuery,
} from "../../../../packages/parser/src/parser/rules/block/module/listpages/types";
import { getContainerType, getChildren, getTextValue, isContainer } from "../../../helpers";
import { parse } from "@wdprlib/parser";

/**
 * Type alias for list-pages module
 */
type ListPagesModule = Extract<Module, { module: "list-pages" }>;

/**
 * Helper to create a minimal page
 */
function createPage(overrides: Partial<PageData> = {}): PageData {
  return {
    name: "test-page",
    category: "_default",
    fullname: "test-page",
    title: "Test Page",
    createdAt: new Date("2024-01-15T12:00:00Z"),
    createdBy: { id: 1, name: "TestUser", unixName: "test-user" },
    updatedAt: new Date("2024-01-20T15:30:00Z"),
    updatedBy: { id: 2, name: "Editor", unixName: "editor" },
    tags: ["tag1", "tag2"],
    hiddenTags: [],
    children: 0,
    comments: 0,
    size: 1000,
    rating: 10,
    ratingVotes: 15,
    revisions: 1,
    ...overrides,
  };
}

/**
 * Helper to create site context
 */
function createSite(overrides: Partial<SiteContext> = {}): SiteContext {
  return {
    name: "test-site",
    title: "Test Site",
    domain: "test.wikidot.com",
    ...overrides,
  };
}

/**
 * Helper to create a ListPages module element
 * Default wrapper=false for simpler test assertions
 */
function createListPagesModule(
  content: Partial<Omit<ListPagesModule, "module">>,
  body?: string,
): Element {
  return {
    element: "module",
    data: {
      module: "list-pages",
      body: body ?? "%%title%%",
      reverse: false,
      separate: false,
      wrapper: false,
      "rss-only": false,
      attributes: {},
      ...content,
    } as ListPagesModule,
  };
}

/**
 * Helper to create a paragraph element
 */
function createParagraph(text: string): Element {
  return {
    element: "container",
    data: {
      type: "paragraph",
      attributes: {},
      elements: [{ element: "text", data: text }],
    },
  };
}

/**
 * Helper to create a SyntaxTree with elements
 */
function createSyntaxTree(elements: Element[]): SyntaxTree {
  return { elements };
}

/**
 * Simple mock parser that creates a paragraph from text
 * Note: Does NOT include footnote-block like real parser would
 */
function mockParse(input: string): SyntaxTree {
  return {
    elements: [createParagraph(input)],
  };
}

/**
 * Helper to create a DataProvider with predefined data
 */
function createDataProvider(dataMap: Map<number, ListPagesExternalData>): DataProvider {
  return {
    fetchListPages: (_query: NormalizedListPagesQuery, req: ListPagesDataRequirement) =>
      dataMap.get(req.id),
  };
}

/**
 * Helper to create requirements from module count
 */
function createRequirements(count: number): { listPages: ListPagesDataRequirement[] } {
  return {
    listPages: Array.from({ length: count }, (_, i) => ({
      id: i,
      query: {},
      neededVariables: [],
      rawAttributes: {},
    })),
  };
}

describe("resolveModules", () => {
  it("preserves side channels inside unresolved IfTags", async () => {
    const initial = parse(
      [
        "[[iftags +component]]",
        "+ Conditional heading",
        "[[footnote]]Conditional note[[/footnote]]",
        "[[/iftags]]",
      ].join("\n"),
      { pageTags: null },
    ).ast;

    const result = await resolveModules(
      initial,
      {},
      {
        parse: (source) => parse(source, { pageTags: null }),
        compiledListPagesTemplates: new Map(),
        requirements: {},
      },
    );

    expect(result.footnotes).toEqual(initial.footnotes);
    expect(result["table-of-contents"]).toEqual(initial["table-of-contents"]);
  });

  it("excludes side channels from non-rendered expression branches when IfTags is unresolved", async () => {
    const visibleFootnote: Element = { element: "footnote" };
    const hiddenFootnote: Element = { element: "footnote" };
    const ast: SyntaxTree = {
      elements: [
        {
          element: "ifexpr",
          data: {
            expression: "1",
            // oxlint-disable-next-line unicorn/no-thenable -- `then` is part of the public AST schema
            then: [visibleFootnote],
            else: [hiddenFootnote],
          },
        },
        { element: "footnote-block", data: { title: null, hide: false } },
      ],
      footnotes: [[{ element: "text", data: "visible" }], [{ element: "text", data: "hidden" }]],
    };

    const result = await resolveModules(
      ast,
      {},
      {
        parse: (source) => parse(source, { pageTags: null }),
        compiledListPagesTemplates: new Map(),
        requirements: {},
      },
    );

    expect(result.footnotes).toEqual([[{ element: "text", data: "visible" }]]);
  });

  it("preserves styles collected by an earlier resolution pass", async () => {
    const ast: SyntaxTree = { elements: [], styles: [".existing { color: red; }"] };

    const result = await resolveModules(
      ast,
      {},
      {
        parse: (source) => parse(source),
        compiledListPagesTemplates: new Map(),
        requirements: {},
      },
    );

    expect(result.styles).toEqual(ast.styles);
  });

  it("does not duplicate unresolved IfTags style slots across repeated resolution", async () => {
    const ast = parse(
      [
        "[[iftags +component]]",
        "[[module CSS]]",
        ".conditional { color: red; }",
        "[[/module]]",
        "[[/iftags]]",
      ].join("\n"),
      { pageTags: null },
    ).ast;
    const options = {
      parse: (source: string) => parse(source, { pageTags: null }),
      compiledListPagesTemplates: new Map<number, CompiledTemplate>(),
      requirements: {},
    };

    const first = await resolveModules(ast, {}, options);
    const second = await resolveModules(first, {}, options);

    expect(second.styles).toEqual(first.styles);
  });

  it("keeps later-resolved ListPages CSS before existing CSS in the same slot interval", async () => {
    const body = "[[module CSS]]\n.dynamic { color: blue; }\n[[/module]]";
    const parsed = parse(
      [
        "[[module CSS]]",
        ".static { color: green; }",
        "[[/module]]",
        "[[iftags +component]]",
        "[[module CSS]]",
        ".conditional { color: red; }",
        "[[/module]]",
        "[[/iftags]]",
      ].join("\n"),
      { pageTags: null },
    ).ast;
    const ast: SyntaxTree = {
      ...parsed,
      elements: [createListPagesModule({}, body), ...parsed.elements],
    };
    const options = {
      parse: (source: string) => parse(source, { pageTags: null }),
      compiledListPagesTemplates: new Map([[0, compileTemplate(body)]]),
      requirements: createRequirements(1),
    };

    const first = await resolveModules(ast, {}, options);
    const second = await resolveModules(
      first,
      createDataProvider(
        new Map([[0, { pages: [createPage()], totalCount: 1, site: createSite() }]]),
      ),
      options,
    );

    expect(second.styles).toEqual([
      ".dynamic { color: blue; }",
      ".static { color: green; }",
      `${STYLE_SLOT_PREFIX}0`,
    ]);
  });

  it("merges ListPages parse side channels and diagnostics", async () => {
    const body = [
      "+ Generated heading",
      "[[html]]<p>generated</p>[[/html]]",
      "[[footnote]]Generated note[[/footnote]]",
      '[[code type="ts"]]const generated = true;[[/code]]',
      "[[module CSS]]",
      ".generated { color: red; }",
      "[[/module]]",
      "[[code]]unclosed",
    ].join("\n");
    const doc = createSyntaxTree([createListPagesModule({}, body)]);
    const dataProvider = createDataProvider(
      new Map([
        [
          0,
          {
            pages: [createPage()],
            totalCount: 1,
            site: createSite(),
          },
        ],
      ]),
    );
    const diagnostics: string[] = [];

    const result = await resolveModules(doc, dataProvider, {
      compiledListPagesTemplates: new Map([[0, compileTemplate(body)]]),
      parse: (source) => parse(source, { appendImplicitFootnoteBlock: false, pageTags: [] }),
      requirements: createRequirements(1),
      onDiagnostics: (items) => diagnostics.push(...items.map((item) => item.code)),
    });

    expect(result.styles).toEqual([".generated { color: red; }"]);
    expect(result["html-blocks"]).toEqual(["<p>generated</p>"]);
    expect(result.footnotes).toHaveLength(1);
    expect(result["code-blocks"]?.[0]?.contents).toBe("const generated = true;");
    expect(result["table-of-contents"]).toHaveLength(1);
    expect(diagnostics).toContain("unclosed-block");
  });

  describe("basic resolution", () => {
    it("should return document unchanged when no ListPages modules", async () => {
      const doc = createSyntaxTree([createParagraph("Hello")]);
      const dataProvider = createDataProvider(new Map());

      const result = await resolveModules(doc, dataProvider, {
        compiledListPagesTemplates: new Map(),
        parse: mockParse,
        requirements: {},
      });

      expect(result.elements.length).toBe(1);
      expect(getContainerType(result.elements[0]!)).toBe("paragraph");
    });

    it("should resolve single ListPages module with single page", async () => {
      const doc = createSyntaxTree([createListPagesModule({}, "%%title%%")]);

      const listPagesData: ListPagesExternalData = {
        pages: [createPage({ title: "Page One" })],
        totalCount: 1,
        site: createSite(),
      };

      const dataProvider = createDataProvider(new Map([[0, listPagesData]]));

      const compiledListPagesTemplates = new Map<number, CompiledTemplate>([
        [0, compileTemplate("%%title%%")],
      ]);

      const result = await resolveModules(doc, dataProvider, {
        compiledListPagesTemplates,
        parse: mockParse,
        requirements: createRequirements(1),
      });

      expect(result.elements.length).toBe(1);
      const para = result.elements[0]!;
      expect(getContainerType(para)).toBe("paragraph");
      const text = getChildren(para)[0]!;
      expect(getTextValue(text)).toBe("Page One");
    });

    it("should resolve ListPages module with multiple pages", async () => {
      const doc = createSyntaxTree([createListPagesModule({}, "%%title%%")]);

      const listPagesData: ListPagesExternalData = {
        pages: [
          createPage({ title: "First" }),
          createPage({ title: "Second" }),
          createPage({ title: "Third" }),
        ],
        totalCount: 3,
        site: createSite(),
      };

      const dataProvider = createDataProvider(new Map([[0, listPagesData]]));

      const compiledListPagesTemplates = new Map<number, CompiledTemplate>([
        [0, compileTemplate("%%title%%")],
      ]);

      const result = await resolveModules(doc, dataProvider, {
        compiledListPagesTemplates,
        parse: mockParse,
        requirements: createRequirements(1),
      });

      expect(result.elements.length).toBe(3);
    });
  });

  describe("empty results", () => {
    it("should return empty children when no pages match", async () => {
      const doc = createSyntaxTree([createListPagesModule({}, "%%title%%")]);

      const listPagesData: ListPagesExternalData = {
        pages: [],
        totalCount: 0,
        site: createSite(),
      };

      const dataProvider = createDataProvider(new Map([[0, listPagesData]]));

      const compiledListPagesTemplates = new Map<number, CompiledTemplate>([
        [0, compileTemplate("%%title%%")],
      ]);

      const result = await resolveModules(doc, dataProvider, {
        compiledListPagesTemplates,
        parse: mockParse,
        requirements: createRequirements(1),
      });

      expect(result.elements.length).toBe(0);
    });
  });

  describe("separate option", () => {
    it("should wrap items in divs when separate=true", async () => {
      const doc = createSyntaxTree([createListPagesModule({ separate: true }, "%%title%%")]);

      const listPagesData: ListPagesExternalData = {
        pages: [createPage({ title: "Item" })],
        totalCount: 1,
        site: createSite(),
      };

      const dataProvider = createDataProvider(new Map([[0, listPagesData]]));

      const compiledListPagesTemplates = new Map<number, CompiledTemplate>([
        [0, compileTemplate("%%title%%")],
      ]);

      const result = await resolveModules(doc, dataProvider, {
        compiledListPagesTemplates,
        parse: mockParse,
        requirements: createRequirements(1),
      });

      expect(result.elements.length).toBe(1);
      const div = result.elements[0]!;
      expect(getContainerType(div)).toBe("div");
      if (isContainer(div)) {
        expect(div.data.attributes.class).toBe("list-pages-item");
      }
    });
  });

  describe("wrapper option", () => {
    it("should wrap all items in box div when wrapper=true", async () => {
      const doc = createSyntaxTree([createListPagesModule({ wrapper: true }, "%%title%%")]);

      const listPagesData: ListPagesExternalData = {
        pages: [createPage({ title: "Item" })],
        totalCount: 1,
        site: createSite(),
      };

      const dataProvider = createDataProvider(new Map([[0, listPagesData]]));

      const compiledListPagesTemplates = new Map<number, CompiledTemplate>([
        [0, compileTemplate("%%title%%")],
      ]);

      const result = await resolveModules(doc, dataProvider, {
        compiledListPagesTemplates,
        parse: mockParse,
        requirements: createRequirements(1),
      });

      expect(result.elements.length).toBe(1);
      const div = result.elements[0]!;
      expect(getContainerType(div)).toBe("div");
      if (isContainer(div)) {
        expect(div.data.attributes.class).toBe("list-pages-box");
      }
    });
  });

  describe("prepend/append lines", () => {
    it("should add prependLine before items when separate=false", async () => {
      const doc = createSyntaxTree([
        createListPagesModule({ "prepend-line": "Header", separate: false }, "%%title%%"),
      ]);

      const listPagesData: ListPagesExternalData = {
        pages: [createPage({ title: "Item" })],
        totalCount: 1,
        site: createSite(),
      };

      const dataProvider = createDataProvider(new Map([[0, listPagesData]]));

      const compiledListPagesTemplates = new Map<number, CompiledTemplate>([
        [0, compileTemplate("%%title%%")],
      ]);

      const result = await resolveModules(doc, dataProvider, {
        compiledListPagesTemplates,
        parse: mockParse,
        requirements: createRequirements(1),
      });

      // prependLine paragraph + item paragraph
      expect(result.elements.length).toBe(2);
      const prepend = result.elements[0]!;
      const prependText = getChildren(prepend)[0]!;
      expect(getTextValue(prependText)).toBe("Header");
    });

    it("should add appendLine after items when separate=false", async () => {
      const doc = createSyntaxTree([
        createListPagesModule({ "append-line": "Footer", separate: false }, "%%title%%"),
      ]);

      const listPagesData: ListPagesExternalData = {
        pages: [createPage({ title: "Item" })],
        totalCount: 1,
        site: createSite(),
      };

      const dataProvider = createDataProvider(new Map([[0, listPagesData]]));

      const compiledListPagesTemplates = new Map<number, CompiledTemplate>([
        [0, compileTemplate("%%title%%")],
      ]);

      const result = await resolveModules(doc, dataProvider, {
        compiledListPagesTemplates,
        parse: mockParse,
        requirements: createRequirements(1),
      });

      // item paragraph + appendLine paragraph
      expect(result.elements.length).toBe(2);
      const append = result.elements[1]!;
      const appendText = getChildren(append)[0]!;
      expect(getTextValue(appendText)).toBe("Footer");
    });

    it("should not add prepend/append when separate=true", async () => {
      const doc = createSyntaxTree([
        createListPagesModule(
          { "prepend-line": "Header", "append-line": "Footer", separate: true },
          "%%title%%",
        ),
      ]);

      const listPagesData: ListPagesExternalData = {
        pages: [createPage({ title: "Item" })],
        totalCount: 1,
        site: createSite(),
      };

      const dataProvider = createDataProvider(new Map([[0, listPagesData]]));

      const compiledListPagesTemplates = new Map<number, CompiledTemplate>([
        [0, compileTemplate("%%title%%")],
      ]);

      const result = await resolveModules(doc, dataProvider, {
        compiledListPagesTemplates,
        parse: mockParse,
        requirements: createRequirements(1),
      });

      // Only the wrapped item
      expect(result.elements.length).toBe(1);
      expect(getContainerType(result.elements[0]!)).toBe("div");
    });
  });

  describe("pagination variables", () => {
    it("should provide correct index for each page", async () => {
      const doc = createSyntaxTree([createListPagesModule({}, "%%index%%")]);

      const listPagesData: ListPagesExternalData = {
        pages: [createPage(), createPage(), createPage()],
        totalCount: 3,
        site: createSite(),
      };

      const dataProvider = createDataProvider(new Map([[0, listPagesData]]));

      const compiledListPagesTemplates = new Map<number, CompiledTemplate>([
        [0, compileTemplate("%%index%%")],
      ]);

      const result = await resolveModules(doc, dataProvider, {
        compiledListPagesTemplates,
        parse: mockParse,
        requirements: createRequirements(1),
      });

      expect(result.elements.length).toBe(3);
      expect(getTextValue(getChildren(result.elements[0]!)[0]!)).toBe("1");
      expect(getTextValue(getChildren(result.elements[1]!)[0]!)).toBe("2");
      expect(getTextValue(getChildren(result.elements[2]!)[0]!)).toBe("3");
    });

    it("should provide correct total", async () => {
      const doc = createSyntaxTree([createListPagesModule({}, "%%total%%")]);

      const listPagesData: ListPagesExternalData = {
        pages: [createPage()],
        totalCount: 100,
        site: createSite(),
      };

      const dataProvider = createDataProvider(new Map([[0, listPagesData]]));

      const compiledListPagesTemplates = new Map<number, CompiledTemplate>([
        [0, compileTemplate("%%total%%")],
      ]);

      const result = await resolveModules(doc, dataProvider, {
        compiledListPagesTemplates,
        parse: mockParse,
        requirements: createRequirements(1),
      });

      const text = getChildren(result.elements[0]!)[0]!;
      expect(getTextValue(text)).toBe("100");
    });
  });

  describe("missing data handling", () => {
    it("should output nothing when no data for module", async () => {
      const doc = createSyntaxTree([createListPagesModule({}, "%%title%%")]);

      // DataProvider returns undefined for module 0
      const dataProvider = createDataProvider(new Map());

      const compiledListPagesTemplates = new Map<number, CompiledTemplate>([
        [0, compileTemplate("%%title%%")],
      ]);

      const result = await resolveModules(doc, dataProvider, {
        compiledListPagesTemplates,
        parse: mockParse,
        requirements: createRequirements(1),
      });

      // データがないモジュールは何も出力しない（空のリストとして扱う）
      expect(result.elements.length).toBe(0);
    });
  });

  describe("multiple modules", () => {
    it("should resolve multiple ListPages modules in sequence", async () => {
      const doc = createSyntaxTree([
        createListPagesModule({}, "First: %%title%%"),
        createListPagesModule({}, "Second: %%title%%"),
      ]);

      const dataProvider = createDataProvider(
        new Map([
          [
            0,
            {
              pages: [createPage({ title: "PageA" })],
              totalCount: 1,
              site: createSite(),
            },
          ],
          [
            1,
            {
              pages: [createPage({ title: "PageB" })],
              totalCount: 1,
              site: createSite(),
            },
          ],
        ]),
      );

      const compiledListPagesTemplates = new Map<number, CompiledTemplate>([
        [0, compileTemplate("First: %%title%%")],
        [1, compileTemplate("Second: %%title%%")],
      ]);

      const result = await resolveModules(doc, dataProvider, {
        compiledListPagesTemplates,
        parse: mockParse,
        requirements: createRequirements(2),
      });

      expect(result.elements.length).toBe(2);
      expect(getTextValue(getChildren(result.elements[0]!)[0]!)).toBe("First: PageA");
      expect(getTextValue(getChildren(result.elements[1]!)[0]!)).toBe("Second: PageB");
    });
  });

  describe("callback behavior", () => {
    it("should call fetchListPages for each module", async () => {
      const doc = createSyntaxTree([
        createListPagesModule({}, "%%title%%"),
        createListPagesModule({}, "%%title%%"),
      ]);

      const calledIds: number[] = [];
      const dataProvider: DataProvider = {
        fetchListPages: (_query: NormalizedListPagesQuery, req: ListPagesDataRequirement) => {
          calledIds.push(req.id);
          return {
            pages: [createPage({ title: `Page${req.id}` })],
            totalCount: 1,
            site: createSite(),
          };
        },
      };

      const compiledListPagesTemplates = new Map<number, CompiledTemplate>([
        [0, compileTemplate("%%title%%")],
        [1, compileTemplate("%%title%%")],
      ]);

      await resolveModules(doc, dataProvider, {
        compiledListPagesTemplates,
        parse: mockParse,
        requirements: createRequirements(2),
      });

      expect(calledIds).toEqual([0, 1]);
    });

    it("should handle async fetchListPages", async () => {
      const doc = createSyntaxTree([createListPagesModule({}, "%%title%%")]);

      const dataProvider: DataProvider = {
        fetchListPages: async (
          _query: NormalizedListPagesQuery,
          _req: ListPagesDataRequirement,
        ) => {
          // Simulate async database call
          await new Promise((resolve) => setTimeout(resolve, 10));
          return {
            pages: [createPage({ title: "Async Page" })],
            totalCount: 1,
            site: createSite(),
          };
        },
      };

      const compiledListPagesTemplates = new Map<number, CompiledTemplate>([
        [0, compileTemplate("%%title%%")],
      ]);

      const result = await resolveModules(doc, dataProvider, {
        compiledListPagesTemplates,
        parse: mockParse,
        requirements: createRequirements(1),
      });

      const text = getChildren(result.elements[0]!)[0]!;
      expect(getTextValue(text)).toBe("Async Page");
    });

    it("should skip module when fetchListPages returns null", async () => {
      const doc = createSyntaxTree([createListPagesModule({}, "%%title%%")]);

      const dataProvider: DataProvider = {
        fetchListPages: () => null,
      };

      const compiledListPagesTemplates = new Map<number, CompiledTemplate>([
        [0, compileTemplate("%%title%%")],
      ]);

      const result = await resolveModules(doc, dataProvider, {
        compiledListPagesTemplates,
        parse: mockParse,
        requirements: createRequirements(1),
      });

      expect(result.elements.length).toBe(0);
    });
  });
});

describe("default body template", () => {
  it("should use default template when body is not specified", () => {
    const {
      extractDataRequirements,
    } = require("../../../../packages/parser/src/parser/rules/block/module/listpages/extract");
    const ast: SyntaxTree = {
      elements: [
        {
          element: "module",
          data: {
            module: "list-pages",
            body: undefined,
            reverse: false,
            separate: true,
            wrapper: true,
            "rss-only": false,
            attributes: {},
          },
        },
      ],
    };
    const result = extractDataRequirements(ast);
    // デフォルトテンプレートが適用され、title_linked等の変数が抽出される
    const req = result.requirements.listPages[0];
    expect(req.neededVariables).toContain("title_linked");
    expect(req.neededVariables).toContain("created_by_linked");
  });
});
