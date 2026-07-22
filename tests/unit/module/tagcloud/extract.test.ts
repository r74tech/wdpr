import { describe, it, expect } from "bun:test";
import { extractDataRequirements } from "../../../../packages/parser/src/parser/rules/block/module/listpages/extract";
import type { SyntaxTree, Element, Module } from "@wdprlib/ast";

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

describe("extractDataRequirements - TagCloud", () => {
  it("extracts nothing from empty document", () => {
    const result = extractDataRequirements(createSyntaxTree([]));
    expect(result.requirements.tagCloud).toEqual([]);
  });

  it("extracts a single TagCloud module with category and limit", () => {
    const ast = createSyntaxTree([createTagCloudModule({ category: "blog", limit: 10 })]);
    const result = extractDataRequirements(ast);

    expect(result.requirements.tagCloud).toEqual([{ id: 0, category: "blog", limit: 10 }]);
  });

  it("assigns sequential IDs to multiple TagCloud modules", () => {
    const ast = createSyntaxTree([
      createTagCloudModule(),
      createTagCloudModule({ category: "blog" }),
    ]);
    const result = extractDataRequirements(ast);

    expect(result.requirements.tagCloud).toHaveLength(2);
    expect(result.requirements.tagCloud[0]!.id).toBe(0);
    expect(result.requirements.tagCloud[0]!.category).toBeNull();
    expect(result.requirements.tagCloud[1]!.id).toBe(1);
    expect(result.requirements.tagCloud[1]!.category).toBe("blog");
  });

  it("extracts TagCloud modules nested inside static containers", () => {
    const ast = createSyntaxTree([
      {
        element: "container",
        data: {
          type: "div",
          attributes: {},
          elements: [createTagCloudModule({ limit: 5 })],
        },
      },
    ]);
    const result = extractDataRequirements(ast);

    expect(result.requirements.tagCloud).toEqual([{ id: 0, category: null, limit: 5 }]);
  });

  it("keeps TagCloud IDs independent from ListPages/ListUsers counters", () => {
    const listUsers: Element = {
      element: "module",
      data: { module: "list-users", users: ".", body: "%%name%%", attributes: {} },
    };
    const ast = createSyntaxTree([listUsers, createTagCloudModule()]);
    const result = extractDataRequirements(ast);

    expect(result.requirements.listUsers[0]!.id).toBe(0);
    expect(result.requirements.tagCloud[0]!.id).toBe(0);
  });
});
