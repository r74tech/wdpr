import { describe, expect, it } from "bun:test";
import { parse, resolveModules, resolveIncludes } from "@wdprlib/parser";
import type { SyntaxTree, Element } from "@wdprlib/ast";
import type { DataProvider } from "../../../../packages/parser/src/parser/rules/block/module/types-common";
import type { ResolveOptions } from "../../../../packages/parser/src/parser/rules/block/module/resolve";

/**
 * Helper: create minimal ResolveOptions
 */
function createResolveOptions(overrides: Partial<ResolveOptions> = {}): ResolveOptions {
  return {
    parse,
    compiledListPagesTemplates: new Map(),
    requirements: {},
    ...overrides,
  };
}

/**
 * Helper: resolve with page tags
 */
async function resolveWithTags(ast: SyntaxTree, tags: string[]): Promise<SyntaxTree> {
  const dataProvider: DataProvider = {
    getPageTags: () => tags,
  };
  return resolveModules(ast, dataProvider, createResolveOptions());
}

/**
 * Helper: resolve without page tags (iftags unresolved)
 */
async function resolveWithoutTags(ast: SyntaxTree): Promise<SyntaxTree> {
  const dataProvider: DataProvider = {};
  return resolveModules(ast, dataProvider, createResolveOptions());
}

/**
 * Helper: check if style elements exist in elements tree
 */
function hasStyleElements(elements: Element[]): boolean {
  for (const el of elements) {
    if (el.element === "style") return true;
    if ("data" in el && el.data && typeof el.data === "object") {
      const data = el.data as Record<string, unknown>;
      if ("elements" in data && Array.isArray(data.elements)) {
        if (hasStyleElements(data.elements as Element[])) return true;
      }
    }
  }
  return false;
}

describe("resolve: style collection", () => {
  it("collects top-level style elements into SyntaxTree.styles", async () => {
    const ast = parse("[[module css]]\n.blue { color: blue; }\n[[/module]]");
    const resolved = await resolveWithoutTags(ast);

    expect(resolved.styles).toEqual([".blue { color: blue; }"]);
    expect(hasStyleElements(resolved.elements)).toBe(false);
  });

  it("collects multiple style elements in order", async () => {
    const input = [
      "[[module css]]",
      ".a { color: red; }",
      "[[/module]]",
      "text between",
      "[[module CSS]]",
      ".b { color: blue; }",
      "[[/module]]",
    ].join("\n");
    const ast = parse(input);
    const resolved = await resolveWithoutTags(ast);

    expect(resolved.styles).toEqual([".a { color: red; }", ".b { color: blue; }"]);
    expect(hasStyleElements(resolved.elements)).toBe(false);
  });

  it("collects style elements nested inside containers", async () => {
    const input = [
      "[[div]]",
      "[[module css]]",
      ".nested { margin: 0; }",
      "[[/module]]",
      "[[/div]]",
    ].join("\n");
    const ast = parse(input);
    const resolved = await resolveWithoutTags(ast);

    expect(resolved.styles).toEqual([".nested { margin: 0; }"]);
    expect(hasStyleElements(resolved.elements)).toBe(false);
  });

  it("does not set styles field when no style elements exist", async () => {
    const ast = parse("Hello world");
    const resolved = await resolveWithoutTags(ast);

    expect(resolved.styles).toBeUndefined();
  });

  it("collects empty style (module css with no body)", async () => {
    const ast = parse("[[module css]]\n[[/module]]");
    const resolved = await resolveWithoutTags(ast);

    expect(resolved.styles).toEqual([""]);
  });
});

describe("resolve: iftags", () => {
  it("includes elements when tag condition matches", async () => {
    const input = "[[iftags +fruit]]\nApple\n[[/iftags]]";
    const ast = parse(input);
    const resolved = await resolveWithTags(ast, ["fruit"]);

    // iftags element should be removed, content should be at top level
    const hasIfTags = resolved.elements.some((el) => el.element === "if-tags");
    expect(hasIfTags).toBe(false);

    const text = getAllText(resolved.elements);
    expect(text).toContain("Apple");
  });

  it("excludes elements when tag condition does not match", async () => {
    const input = "[[iftags +fruit]]\nApple\n[[/iftags]]";
    const ast = parse(input);
    const resolved = await resolveWithTags(ast, ["vegetable"]);

    const text = getAllText(resolved.elements);
    expect(text).not.toContain("Apple");
  });

  it("keeps iftags unresolved when no tags callback provided", async () => {
    const input = "[[iftags +fruit]]\nApple\n[[/iftags]]";
    const ast = parse(input);
    const resolved = await resolveWithoutTags(ast);

    const hasIfTags = resolved.elements.some((el) => el.element === "if-tags");
    expect(hasIfTags).toBe(true);
  });

  it("does not collect styles from unresolved iftags", async () => {
    const input = [
      "[[iftags +admin]]",
      "[[module css]]",
      ".admin { color: red; }",
      "[[/module]]",
      "[[/iftags]]",
    ].join("\n");
    const ast = parse(input);
    const resolved = await resolveWithoutTags(ast);

    // Styles inside unresolved iftags should NOT be extracted to tree.styles
    expect(resolved.styles).toBeUndefined();
    // The iftags element should still contain the style element
    const ifTagsEl = resolved.elements.find((el) => el.element === "if-tags");
    expect(ifTagsEl).toBeDefined();
    const ifTagsData = ifTagsEl!.data as { elements: Element[] };
    const hasStyle = ifTagsData.elements.some((el) => el.element === "style");
    expect(hasStyle).toBe(true);
  });

  it("collects styles from resolved iftags into SyntaxTree.styles", async () => {
    const input = [
      "[[iftags +fruit]]",
      "[[module css]]",
      "body { color: red; }",
      "[[/module]]",
      "[[/iftags]]",
    ].join("\n");
    const ast = parse(input);
    const resolved = await resolveWithTags(ast, ["fruit"]);

    expect(resolved.styles).toEqual(["body { color: red; }"]);
    expect(hasStyleElements(resolved.elements)).toBe(false);
  });

  it("does not collect styles from unmatched iftags", async () => {
    const input = [
      "[[iftags +fruit]]",
      "[[module css]]",
      "body { color: red; }",
      "[[/module]]",
      "[[/iftags]]",
    ].join("\n");
    const ast = parse(input);
    const resolved = await resolveWithTags(ast, ["vegetable"]);

    expect(resolved.styles).toBeUndefined();
  });

  it("handles multiple iftags with mixed conditions", async () => {
    const input = [
      "[[iftags +fruit]]",
      "[[module css]]",
      ".fruit { color: green; }",
      "[[/module]]",
      "[[/iftags]]",
      "[[iftags +admin]]",
      "[[module css]]",
      ".admin { color: red; }",
      "[[/module]]",
      "[[/iftags]]",
    ].join("\n");
    const ast = parse(input);
    const resolved = await resolveWithTags(ast, ["fruit"]);

    expect(resolved.styles).toEqual([".fruit { color: green; }"]);
  });

  it("excludes elements with empty condition (supercommentout)", async () => {
    const input = [
      "[[iftags]]",
      "[[module css]]",
      "body { color: red; }",
      "[[/module]]",
      "Hidden content",
      "[[/iftags]]",
    ].join("\n");
    const ast = parse(input);
    const resolved = await resolveWithTags(ast, ["fruit"]);

    expect(resolved.styles).toBeUndefined();
    const text = getAllText(resolved.elements);
    expect(text).not.toContain("Hidden content");
  });

  it("excludes elements with empty condition even with no page tags", async () => {
    const input = "[[iftags]]\nHidden\n[[/iftags]]";
    const ast = parse(input);
    const resolved = await resolveWithTags(ast, []);

    const text = getAllText(resolved.elements);
    expect(text).not.toContain("Hidden");
  });

  it("preserves styles nested inside containers in unresolved iftags", async () => {
    const input = [
      "[[iftags +component]]",
      "[[div]]",
      "[[module css]]",
      ".nested { color: red; }",
      "[[/module]]",
      "[[/div]]",
      "[[/iftags]]",
    ].join("\n");
    const ast = parse(input);
    const resolved = await resolveWithoutTags(ast);

    // Styles inside unresolved iftags should NOT be extracted
    expect(resolved.styles).toBeUndefined();
    // The iftags element should still contain the style element (inside container)
    const ifTagsEl = resolved.elements.find((el) => el.element === "if-tags");
    expect(ifTagsEl).toBeDefined();
    expect(hasStyleElements([ifTagsEl!])).toBe(true);
  });

  it("handles negated tag conditions", async () => {
    const input = "[[iftags -admin]]\nPublic content\n[[/iftags]]";
    const ast = parse(input);
    const resolved = await resolveWithTags(ast, ["fruit"]);

    const text = getAllText(resolved.elements);
    expect(text).toContain("Public content");
  });
});

describe("resolve: include with styles", () => {
  it("collects styles from included pages", async () => {
    const input = "[[include style-page]]";
    const fetcher = (pageRef: { site: string | null; page: string }) => {
      if (pageRef.page === "style-page") {
        return "[[module css]]\n.included { margin: 0; }\n[[/module]]";
      }
      return null;
    };

    const expanded = resolveIncludes(input, fetcher);
    const resolved = parse(expanded);
    const finalResolved = await resolveWithoutTags(resolved);

    expect(finalResolved.styles).toEqual([".included { margin: 0; }"]);
    expect(hasStyleElements(finalResolved.elements)).toBe(false);
  });

  it("collects styles from nested includes", async () => {
    const input = "[[include page-a]]";
    const fetcher = (pageRef: { site: string | null; page: string }) => {
      if (pageRef.page === "page-a") {
        return "[[module css]]\n.a { color: red; }\n[[/module]]\n[[include page-b]]";
      }
      if (pageRef.page === "page-b") {
        return "[[module css]]\n.b { color: blue; }\n[[/module]]";
      }
      return null;
    };

    const expanded = resolveIncludes(input, fetcher);
    const resolved = parse(expanded);
    const finalResolved = await resolveWithoutTags(resolved);

    expect(finalResolved.styles).toEqual([".a { color: red; }", ".b { color: blue; }"]);
  });

  it("collects styles from include inside iftags (matched)", async () => {
    const input = ["[[iftags +component]]", "[[include component:theme]]", "[[/iftags]]"].join(
      "\n",
    );
    const fetcher = (pageRef: { site: string | null; page: string }) => {
      if (pageRef.page === "component:theme") {
        return "[[module css]]\n.theme { background: black; }\n[[/module]]";
      }
      return null;
    };

    const expanded = resolveIncludes(input, fetcher);
    const withIncludes = parse(expanded);
    const resolved = await resolveWithTags(withIncludes, ["component"]);

    expect(resolved.styles).toEqual([".theme { background: black; }"]);
  });
});

/**
 * Helper: collect all text from elements recursively
 */
function getAllText(elements: Element[]): string {
  let result = "";
  for (const el of elements) {
    if (el.element === "text") {
      result += el.data as string;
    }
    if ("data" in el && el.data && typeof el.data === "object") {
      const data = el.data as Record<string, unknown>;
      if ("elements" in data && Array.isArray(data.elements)) {
        result += getAllText(data.elements as Element[]);
      }
    }
  }
  return result;
}
