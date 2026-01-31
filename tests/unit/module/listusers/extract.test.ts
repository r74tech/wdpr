import { describe, it, expect } from "bun:test";
import { extractDataRequirements } from "../../../../packages/parser/src/parser/rules/block/module/listpages/extract";
import type { SyntaxTree, Element } from "@wdprlib/ast";

function createListUsersModule(users = ".", body?: string): Element {
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

describe("extractDataRequirements - ListUsers", () => {
  it("extracts nothing from empty document", () => {
    const result = extractDataRequirements(createSyntaxTree([]));
    expect(result.requirements.listUsers).toEqual([]);
    expect(result.compiledListUsersTemplates.size).toBe(0);
  });

  it("extracts single ListUsers module", () => {
    const ast = createSyntaxTree([createListUsersModule(".", "%%title%%, %%name%%")]);
    const result = extractDataRequirements(ast);

    expect(result.requirements.listUsers).toHaveLength(1);
    expect(result.requirements.listUsers[0]!.id).toBe(0);
    expect(result.requirements.listUsers[0]!.users).toBe(".");
    expect(result.requirements.listUsers[0]!.neededVariables).toContain("title");
    expect(result.requirements.listUsers[0]!.neededVariables).toContain("name");
  });

  it("extracts all three variables", () => {
    const ast = createSyntaxTree([createListUsersModule(".", "%%number%% %%title%% %%name%%")]);
    const result = extractDataRequirements(ast);

    expect(result.requirements.listUsers[0]!.neededVariables).toHaveLength(3);
    expect(result.requirements.listUsers[0]!.neededVariables).toContain("number");
    expect(result.requirements.listUsers[0]!.neededVariables).toContain("title");
    expect(result.requirements.listUsers[0]!.neededVariables).toContain("name");
  });

  it("assigns sequential IDs to multiple ListUsers modules", () => {
    const ast = createSyntaxTree([
      createListUsersModule(".", "%%title%%"),
      createListUsersModule(".", "%%name%%"),
    ]);
    const result = extractDataRequirements(ast);

    expect(result.requirements.listUsers).toHaveLength(2);
    expect(result.requirements.listUsers[0]!.id).toBe(0);
    expect(result.requirements.listUsers[1]!.id).toBe(1);
  });

  it("compiles templates", () => {
    const ast = createSyntaxTree([createListUsersModule(".", "Hello %%title%%")]);
    const result = extractDataRequirements(ast);

    expect(result.compiledListUsersTemplates.size).toBe(1);
    const template = result.compiledListUsersTemplates.get(0)!;
    expect(template({ user: { number: 1, title: "Foo", name: "foo" } })).toBe("Hello Foo");
  });

  it("handles empty body", () => {
    const ast = createSyntaxTree([createListUsersModule(".")]);
    const result = extractDataRequirements(ast);

    expect(result.requirements.listUsers[0]!.neededVariables).toEqual([]);
  });

  it("IDs are independent from ListPages IDs", () => {
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
    const result = extractDataRequirements(ast);

    expect(result.requirements.listPages[0]!.id).toBe(0);
    expect(result.requirements.listUsers[0]!.id).toBe(0);
  });
});
