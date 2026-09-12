import { describe, expect, it } from "bun:test";
import { parse as parseResult, processWikitext } from "@wdprlib/parser";
import { renderToHtml, renderWikitext } from "@wdprlib/render";
import { serialize } from "@wdprlib/decompiler";
import { normalizePageName } from "../../../packages/render/src/context/page-name";

const parse = (source: string) => parseResult(source).ast;

describe("internal link labels", () => {
  it("preserves hash-routing paths without consulting local page resolvers", () => {
    const html = renderToHtml(parse("[[[MAIN/sub_dir/#/Page|Hash routing]]]"), {
      page: {
        pageName: "current",
        pageExists: () => {
          throw new Error("unexpected local existence lookup");
        },
        pageTitle: () => {
          throw new Error("unexpected local title lookup");
        },
      },
    });
    expect(html).toContain('href="/main/sub_dir#/page">Hash routing</a>');
  });
  it("matches the reference punctuation, anchor and empty-label examples", () => {
    const html = renderToHtml(parse('[[[link "TO" a; pagE]]] [[[doc#toc1]]] [[[some page|]]]'));
    expect(html).toContain('href="/link-to-a-page" class="newpage">link "TO" a; pagE</a>');
    expect(html).toContain('href="/doc#toc1" class="newpage">doc</a>');
    expect(html).toContain('href="/some-page" class="newpage">some-page</a>');
  });

  it.each(["[[[some page|]]]", "[[[doc#toc1|doc#toc1]]]", "[[[cat:page|cat:page]]]"])(
    "preserves label semantics through serialization: %s",
    (source) => {
      const ast = parse(source);
      expect(parse(serialize(structuredClone(ast)))).toEqual(ast);
    },
  );

  it.each([
    ["  日本語 ページ！ ", "日本語-ページ"],
    ["_default:Some Page", "some-page"],
    ["Cat:_template", "cat:_template"],
    ["a:b:c", "a-b:c"],
    ["ＡＢＣ", "abc"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePageName(input)).toBe(expected);
  });

  it.each(["Page <title>", ""])("uses a resolved title (%s) as evidence of existence", (title) => {
    const calls: string[] = [];
    const html = renderToHtml(parse("[[[Some Page#toc1|]]]"), {
      page: {
        pageName: "current",
        pageTitle: (name) => {
          calls.push(name);
          return title;
        },
      },
    });
    expect(calls).toEqual(["some-page"]);
    expect(html).not.toContain("newpage");
    expect(html).toContain(title ? "Page &lt;title&gt;</a>" : "></a>");
  });

  it("lets explicit nonexistence override a title", () => {
    const html = renderToHtml(parse("[[[Some Page|]]]"), {
      page: { pageName: "current", pageExists: () => false, pageTitle: () => "Title" },
    });
    expect(html).toContain('class="newpage">some-page</a>');
  });

  it("resolves titles in one batch with canonical names", async () => {
    const document = await processWikitext("[[[Some Page|]]] [[[Some Page#toc1|]]]", {
      page: { fullName: "current", unixName: "current", tags: [], urlPath: "/current" },
    });
    const calls: string[][] = [];
    const result = await renderWikitext(document, {
      resolvers: {
        resolvePageTitles: async (names) => {
          calls.push(names);
          return new Map([["some-page", "Title"]]);
        },
      },
    });
    expect(calls).toEqual([["some-page"]]);
    expect(result.html.match(/>Title<\/a>/g)).toHaveLength(2);
    expect(result.html).not.toContain("newpage");
    const missing = await renderWikitext(document, {
      resolvers: {
        resolvePageTitles: async () => new Map([["some-page", "Title"]]),
        resolvePageExistence: async () => new Set(),
      },
    });
    expect(missing.html.match(/class="newpage">some-page<\/a>/g)).toHaveLength(2);
  });
});
