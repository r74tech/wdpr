import { describe, expect, test } from "bun:test";
import {
  extractDataRequirements,
  parse,
  resolveIncludes,
  resolveModules,
  type DataProvider,
  type ListPagesDataRequirement,
  type ListUsersDataRequirement,
  type NormalizedListPagesQuery,
} from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import type { ContainerData, Element, IncludeData, PageRef, SyntaxTree } from "@wdprlib/ast";
import type { PageData, SiteContext } from "@wdprlib/parser";
import { getAllText } from "../../../helpers";
import { createFixturePageFetcher } from "./fixture-pages";

function createPage(): PageData {
  return {
    name: "page",
    category: "_default",
    fullname: "page",
    title: "Page",
    createdAt: new Date("2026-06-18T00:00:00Z"),
    updatedAt: new Date("2026-06-18T00:00:00Z"),
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

function createSite(): SiteContext {
  return {
    name: "www",
    title: "WWW",
    domain: "www.test",
  };
}

describe("include secondary transformation", () => {
  test("resolveModules can transform module-generated source before re-parsing", async () => {
    const source = ['[[module ListUsers users="."]]', "before MARKER %%name%%", "[[/module]]"].join(
      "\n",
    );
    const ast = parse(source).ast;
    const extraction = extractDataRequirements(ast);
    const seenSources: string[] = [];

    const resolved = await resolveModules(
      ast,
      {
        fetchListUsers: (_req: ListUsersDataRequirement) => ({
          user: {
            number: -1,
            title: "staff",
            name: "staff",
          },
        }),
      },
      {
        parse: (input) => parse(input).ast,
        compiledListPagesTemplates: extraction.compiledListPagesTemplates,
        compiledListUsersTemplates: extraction.compiledListUsersTemplates,
        requirements: extraction.requirements,
        transformModuleSource: (moduleSource) => {
          seenSources.push(moduleSource);
          return moduleSource.replace("MARKER", "HOOKED");
        },
      },
    );

    expect(seenSources).toEqual(["before MARKER staff"]);
    expect(getAllText(resolved.elements)).toContain("before HOOKED staff");
  });

  test("ListPages can finish inc-loop after the top-level include limit", async () => {
    const source = [
      '[[module ListPages range="." limit="1"]]',
      "[[include :www:loop c=__________|p=:www:view]]",
      "|name=%%title%%",
      "|raw=OK]]",
      "[[/module]]",
    ].join("\n");
    const includeFetcher = createFixturePageFetcher("include-pages");
    const expanded = resolveIncludes(source, includeFetcher);
    const ast = parse(expanded).ast;
    const extraction = extractDataRequirements(ast);

    const dataProvider: DataProvider = {
      fetchInclude: includeFetcher,
      fetchListPages: (_query: NormalizedListPagesQuery, _req: ListPagesDataRequirement) => ({
        pages: [createPage()],
        totalCount: 1,
        site: createSite(),
      }),
    };

    const resolved = await resolveModules(ast, dataProvider, {
      parse: (input) => parse(input).ast,
      compiledListPagesTemplates: extraction.compiledListPagesTemplates,
      compiledListUsersTemplates: extraction.compiledListUsersTemplates,
      requirements: extraction.requirements,
    });

    const text = getAllText(resolved.elements);
    const html = renderToHtml(resolved);
    expect(text).toContain("TARGET name=Page");
    expect(text).toContain("TARGET raw=OK");
    expect(text).not.toContain("{$raw}");
    expect(text).not.toContain("[[include");
    expect(html).toContain('class="target-render"');
    expect(html).toContain("TARGET raw=OK");
  });

  test("ListUsers renders inc-loop target for c=10..14 but leaves c=15 unresolved", async () => {
    const includeFetcher = createFixturePageFetcher("include-pages");
    const successCases = [10, 11, 12, 13, 14];

    for (const count of successCases) {
      const resolved = await resolveListUsersIncLoop("_".repeat(count), includeFetcher);
      const text = getAllText(resolved.elements);
      const html = renderToHtml(resolved);
      expect(text).toContain("TARGET name=staff#-1");
      expect(text).toContain("TARGET raw=OK");
      expect(text).not.toContain("{$raw}");
      expect(hasRenderedTargetContainer(resolved)).toBe(true);
      expect(hasUnresolvedTargetInclude(resolved)).toBe(false);
      expect(html).toContain('class="target-render"');
      expect(html).toContain("TARGET raw=OK");
    }

    const c15 = await resolveListUsersIncLoop("_".repeat(15), includeFetcher);
    const c15Text = getAllText(c15.elements);
    const c15Html = renderToHtml(c15);
    expect(c15Text).not.toContain("TARGET name=staff#-1");
    expect(c15Text).not.toContain("TARGET raw=OK");
    expect(hasRenderedTargetContainer(c15)).toBe(false);
    expect(hasUnresolvedTargetInclude(c15)).toBe(true);
    expect(c15Html).not.toContain('class="target-render"');
    expect(c15Html).not.toContain("TARGET raw=OK");
  });
});

async function resolveListUsersIncLoop(
  c: string,
  includeFetcher: (pageRef: PageRef) => string | null,
) {
  const source = [
    '[[module ListUsers users="."]]',
    "[[include :www:loop c=" + c + "|p=:www:view]]",
    "|name=%%title%%#%%number%%",
    "|raw=OK]]",
    "[[/module]]",
  ].join("\n");
  const expanded = resolveIncludes(source, includeFetcher);
  const ast = parse(expanded).ast;
  const extraction = extractDataRequirements(ast);

  const dataProvider: DataProvider = {
    fetchInclude: includeFetcher,
    fetchListUsers: (_req: ListUsersDataRequirement) => ({
      user: {
        number: -1,
        title: "staff",
        name: "staff",
      },
    }),
  };

  return resolveModules(ast, dataProvider, {
    parse: (input) => parse(input).ast,
    compiledListPagesTemplates: extraction.compiledListPagesTemplates,
    compiledListUsersTemplates: extraction.compiledListUsersTemplates,
    requirements: extraction.requirements,
  });
}

function hasRenderedTargetContainer(tree: SyntaxTree): boolean {
  return tree.elements.some(isRenderedTargetContainer);
}

function isRenderedTargetContainer(element: Element): boolean {
  if (element.element !== "container") return false;

  const data = element.data as ContainerData;
  if (data.type === "div" && data.attributes.class === "target-render") {
    return getAllText(data.elements).includes("TARGET raw=OK");
  }

  return data.elements.some(isRenderedTargetContainer);
}

function hasUnresolvedTargetInclude(tree: SyntaxTree): boolean {
  return tree.elements.some(isUnresolvedTargetInclude);
}

function isUnresolvedTargetInclude(element: Element): boolean {
  if (element.element === "include") {
    const data = element.data as IncludeData;
    return (
      data.location.site === "www" &&
      data.location.page === "view" &&
      data.elements.length === 0 &&
      data.variables.name === "staff#-1" &&
      data.variables.raw === "OK"
    );
  }

  if (element.element !== "container") return false;
  return (element.data as ContainerData).elements.some(isUnresolvedTargetInclude);
}
