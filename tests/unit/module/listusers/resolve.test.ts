import { describe, it, expect } from "bun:test";
import { resolveModules } from "../../../../packages/parser/src/parser/rules/block/module/resolve";
import { compileListUsersTemplate } from "../../../../packages/parser/src/parser/rules/block/module/listusers/compiler";
import type { SyntaxTree, Element } from "@wdprlib/ast";
import type { DataProvider } from "../../../../packages/parser/src/parser/rules/block/module/types-common";
import type { ListUsersCompiledTemplate } from "../../../../packages/parser/src/parser/rules/block/module/listusers/types";

function getTextData(el: Element): string {
  if (el.element === "text") return el.data;
  throw new Error(`Expected text element, got ${el.element}`);
}

function createListUsersModule(users = ".", body = "%%title%%"): Element {
  return {
    element: "module",
    data: {
      module: "list-users" as const,
      users,
      body,
      attributes: {},
    },
  };
}

function createSyntaxTree(elements: Element[]): SyntaxTree {
  return { elements, styles: [] };
}

function simpleParse(input: string): { elements: Element[] } {
  return { elements: [{ element: "text", data: input }] };
}

describe("resolveModules - ListUsers", () => {
  it("resolves single ListUsers module with one user", async () => {
    const ast = createSyntaxTree([createListUsersModule(".", "Hello %%title%%!")]);
    const template = compileListUsersTemplate("Hello %%title%%!");

    const dataProvider: DataProvider = {
      fetchListUsers: () => ({
        user: { number: 1, title: "Alice", name: "alice" },
      }),
    };

    const result = await resolveModules(ast, dataProvider, {
      parse: simpleParse,
      compiledListPagesTemplates: new Map(),
      compiledListUsersTemplates: new Map([[0, template]]),
      requirements: {
        listUsers: [{ id: 0, users: ".", neededVariables: ["title"] }],
      },
    });

    expect(result.elements).toHaveLength(1);
    expect(result.elements[0]!.element).toBe("text");
    expect(getTextData(result.elements[0]!)).toBe("Hello Alice!");
  });

  it("outputs nothing when fetchListUsers returns null", async () => {
    const ast = createSyntaxTree([createListUsersModule()]);
    const template = compileListUsersTemplate("%%title%%");

    const dataProvider: DataProvider = {
      fetchListUsers: () => null,
    };

    const result = await resolveModules(ast, dataProvider, {
      parse: simpleParse,
      compiledListPagesTemplates: new Map(),
      compiledListUsersTemplates: new Map([[0, template]]),
      requirements: {
        listUsers: [{ id: 0, users: ".", neededVariables: ["title"] }],
      },
    });

    expect(result.elements).toHaveLength(0);
  });

  it("keeps module element when fetchListUsers not provided", async () => {
    const ast = createSyntaxTree([createListUsersModule()]);

    const dataProvider: DataProvider = {};

    const result = await resolveModules(ast, dataProvider, {
      parse: simpleParse,
      compiledListPagesTemplates: new Map(),
      requirements: {},
    });

    expect(result.elements).toHaveLength(1);
    expect(result.elements[0]!.element).toBe("module");
  });

  it("resolves multiple ListUsers modules with independent IDs", async () => {
    const ast = createSyntaxTree([
      createListUsersModule(".", "%%title%%"),
      createListUsersModule(".", "%%number%%"),
    ]);
    const template0 = compileListUsersTemplate("%%title%%");
    const template1 = compileListUsersTemplate("%%number%%");

    const dataProvider: DataProvider = {
      fetchListUsers: (req) => {
        if (req.id === 0) return { user: { number: 1, title: "Alice", name: "alice" } };
        if (req.id === 1) return { user: { number: 42, title: "Bob", name: "bob" } };
        return null;
      },
    };

    const result = await resolveModules(ast, dataProvider, {
      parse: simpleParse,
      compiledListPagesTemplates: new Map(),
      compiledListUsersTemplates: new Map<number, ListUsersCompiledTemplate>([
        [0, template0],
        [1, template1],
      ]),
      requirements: {
        listUsers: [
          { id: 0, users: ".", neededVariables: ["title"] },
          { id: 1, users: ".", neededVariables: ["number"] },
        ],
      },
    });

    expect(result.elements).toHaveLength(2);
    expect(getTextData(result.elements[0]!)).toBe("Alice");
    expect(getTextData(result.elements[1]!)).toBe("42");
  });

  it("resolves ListPages and ListUsers in same document", async () => {
    const ast = createSyntaxTree([
      {
        element: "module",
        data: {
          module: "list-pages" as const,
          reverse: false,
          separate: false,
          wrapper: false,
          "rss-only": false,
          body: "%%title%%",
          attributes: {},
        },
      },
      createListUsersModule(".", "%%name%%"),
    ]);

    const listUsersTemplate = compileListUsersTemplate("%%name%%");

    const dataProvider: DataProvider = {
      fetchListPages: () => ({
        pages: [
          {
            name: "test",
            category: "_default",
            fullname: "_default:test",
            title: "Test Page",
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: [],
            hiddenTags: [],
            children: 0,
            comments: 0,
            size: 100,
            rating: 0,
            ratingVotes: 0,
            revisions: 1,
          },
        ],
        totalCount: 1,
        site: { name: "test", title: "Test", domain: "test.wikidot.com" },
      }),
      fetchListUsers: () => ({
        user: { number: 1, title: "Alice", name: "alice" },
      }),
    };

    // compileTemplate for ListPages
    const { compileTemplate } =
      await import("../../../../packages/parser/src/parser/rules/block/module/listpages/compiler");
    const listPagesTemplate = compileTemplate("%%title%%");

    const result = await resolveModules(ast, dataProvider, {
      parse: simpleParse,
      compiledListPagesTemplates: new Map([[0, listPagesTemplate]]),
      compiledListUsersTemplates: new Map([[0, listUsersTemplate]]),
      requirements: {
        listPages: [
          {
            id: 0,
            query: {},
            neededVariables: ["title"],
            rawAttributes: {},
          },
        ],
        listUsers: [{ id: 0, users: ".", neededVariables: ["name"] }],
      },
    });

    expect(result.elements).toHaveLength(2);
    expect(getTextData(result.elements[0]!)).toBe("Test Page");
    expect(getTextData(result.elements[1]!)).toBe("alice");
  });
});
