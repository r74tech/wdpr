import { describe, it, expect } from "bun:test";
import {
  DEFAULT_SETTINGS,
  type Element,
  type Module,
  type WikitextPageContext,
  type WikitextSettings,
} from "@wdprlib/ast";
import { findThemePreviewerUrl, parse, processWikitext } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { themePreviewerModuleRule } from "../../../../packages/parser/src/parser/rules/block/module/theme-previewer";
import type { ParseContext } from "../../../../packages/parser/src/parser/rules/types";

const SCP_JP_SIGMA = "https://scp-jp.github.io/sigma/css/sigma.css";
const SCPWIKI_SIGMA = "https://scpwiki.github.io/sigma/css/sigma.css";

const page: WikitextPageContext = { fullName: "theme-test", tags: [] };
const styleAllowed: WikitextSettings = { ...DEFAULT_SETTINGS, allowStyleElements: true };

function parseRule(args: Record<string, string>): Module | Element {
  return themePreviewerModuleRule.parse({} as ParseContext, 0, args);
}

describe("themePreviewerModuleRule", () => {
  it("keeps http(s), protocol-relative and root-relative theme URLs", () => {
    for (const url of [
      SCP_JP_SIGMA,
      "http://scp-jp.github.io/sigma/css/sigma.css",
      "//scpwiki.github.io/sigma/css/sigma.css",
      "/local--theme/scp-sigma-9-off-canvas/style.css",
    ]) {
      expect(parseRule({ theme_url: url })).toEqual({
        module: "theme-previewer",
        "theme-url": url,
      });
    }
  });

  it("drops missing, relative, non-http(s) and malformed theme URLs", () => {
    for (const url of [
      "",
      "  ",
      "sigma.css",
      "javascript:alert(1)",
      "data:text/css,body{}",
      "https://scp-jp.github.io/sigma/css/a b.css",
      "https://[",
      "https://scp-jp.github.io:bad/sigma.css",
      "/",
    ]) {
      expect(parseRule({ theme_url: url })).toMatchObject({ "theme-url": null });
    }
    expect(parseRule({})).toMatchObject({ "theme-url": null });
  });
});

describe("[[module ThemePreviewer]]", () => {
  const source = `[[module ThemePreviewer theme_url="${SCP_JP_SIGMA}"]]`;

  it("parses as a theme-previewer module instead of an unknown module", () => {
    const { ast } = parse(source);
    expect(ast.elements[0]).toEqual({
      element: "module",
      data: { module: "theme-previewer", "theme-url": SCP_JP_SIGMA },
    });
  });

  it("renders no markup and no error block", () => {
    const html = renderToHtml(parse(`before\n\n${source}\n\nafter`).ast);
    expect(html).not.toContain("error-block");
    expect(html).not.toContain("sigma.css");
    expect(html).toContain("before");
    expect(html).toContain("after");
  });
});

describe("findThemePreviewerUrl", () => {
  it("returns null when no module previews a theme", () => {
    expect(findThemePreviewerUrl(parse("text").ast.elements, styleAllowed)).toBeNull();
    expect(
      findThemePreviewerUrl(parse("[[module ThemePreviewer]]").ast.elements, styleAllowed),
    ).toBeNull();
  });

  it("returns the first valid URL, including nested modules", () => {
    const { ast } = parse(
      [
        '[[module ThemePreviewer theme_url="https://["]]',
        "[[div]]",
        `[[module ThemePreviewer theme_url="${SCP_JP_SIGMA}"]]`,
        "[[/div]]",
        `[[module ThemePreviewer theme_url="${SCPWIKI_SIGMA}"]]`,
      ].join("\n"),
    );
    expect(findThemePreviewerUrl(ast.elements, styleAllowed)).toBe(SCP_JP_SIGMA);
  });

  it("returns null while allowStyleElements is disabled", () => {
    const { ast } = parse(`[[module ThemePreviewer theme_url="${SCP_JP_SIGMA}"]]`);
    expect(findThemePreviewerUrl(ast.elements, DEFAULT_SETTINGS)).toBeNull();
  });
});

describe("processWikitext themeUrl", () => {
  const includeProvider = {
    fetchInclude: async ({ page: name }: { page: string }) =>
      name === "theme:sigma" ? `[[module ThemePreviewer theme_url="${SCPWIKI_SIGMA}"]]` : null,
  };

  it("is null without a ThemePreviewer module", async () => {
    const result = await processWikitext("text", { page, settings: styleAllowed });
    expect(result.themeUrl).toBeNull();
  });

  it("exposes the theme URL from an included page", async () => {
    const result = await processWikitext("[[include theme:sigma]]", {
      page,
      settings: styleAllowed,
      dataProvider: includeProvider,
    });
    expect(result.themeUrl).toBe(SCPWIKI_SIGMA);
  });

  it("is null with the default settings", async () => {
    const result = await processWikitext("[[include theme:sigma]]", {
      page,
      dataProvider: includeProvider,
    });
    expect(result.themeUrl).toBeNull();
  });
});
