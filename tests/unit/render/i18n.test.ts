import { describe, expect, it } from "bun:test";
import { parse } from "@wdprlib/parser";
import { DEFAULT_SETTINGS } from "@wdprlib/ast";
import type { SyntaxTree } from "@wdprlib/ast";
import { Window } from "happy-dom";
import { renderToHtml, renderWikitext, type RenderI18n } from "@wdprlib/render";
import catalog from "./fixtures/i18n/messages.ja.json";
import { normalizeForParity } from "../../helpers/normalize-parity";

describe("renderer i18n", () => {
  it.each(["en", "ja"])(
    "matches the saved %s preview through both render APIs and the fixture AST",
    async (locale) => {
      const fixture = new URL("./fixtures/i18n/", import.meta.url);
      const source = await Bun.file(new URL("input.ftml", fixture)).text();
      const expectedAst: SyntaxTree = await Bun.file(new URL("expected.json", fixture)).json();
      const preview = await Bun.file(new URL(`wikidot.${locale}.html`, fixture)).text();
      const options = locale === "ja" ? { i18n: { locale, messages: catalog } } : {};
      const { ast } = parse(source);
      expect(ast).toEqual(expectedAst);
      expect(renderToHtml(ast)).toBe(
        (await Bun.file(new URL("output.html", fixture)).text()).trim(),
      );
      const pipeline = await renderWikitext(
        {
          ast,
          settings: DEFAULT_SETTINGS,
          page: {
            fullName: "test",
            unixName: "test",
            tags: [],
            urlPath: "/test",
          },
        },
        options,
      );
      const original = new Window().document;
      original.body.innerHTML = preview;
      // The renderer uses HTTPS and rel protection for the fixed documentation link.
      const documentation = original.querySelector('a[href="http://www.wikidot.com/doc:modules"]')!;
      documentation.setAttribute("href", "https://www.wikidot.com/doc:modules");
      documentation.setAttribute("rel", "noopener noreferrer");
      for (const html of [
        renderToHtml(ast, options),
        renderToHtml(expectedAst, options),
        pipeline.html,
      ]) {
        const actual = new Window().document;
        actual.body.innerHTML = html;
        expect(normalizeForParity(actual.body.innerHTML)).toBe(
          normalizeForParity(original.body.innerHTML),
        );
        // The general parity normalizer removes rate widgets; compare their labels directly.
        expect(actual.querySelector(".rate-points")?.textContent).toBe(
          original.querySelector(".rate-points")?.textContent,
        );
        // The English preview site disables downvotes; WDPR still renders that control.
        if (locale === "en") {
          expect(original.querySelector(".ratedown")).toBeNull();
          actual.querySelector(".ratedown")?.remove();
        }
        expect(
          [...actual.querySelectorAll(".page-rate-widget-box a")].map((a) =>
            a.getAttribute("title"),
          ),
        ).toEqual(
          [...original.querySelectorAll(".page-rate-widget-box a")].map((a) =>
            a.getAttribute("title"),
          ),
        );
      }
    },
  );
  it("uses a caller catalog and falls back to English for missing entries", () => {
    const { ast } = parse("[[toc]]\n\n+ Heading");
    const html = renderToHtml(ast, {
      i18n: { locale: "ja", messages: { "toc.title": "目次" } },
    });

    expect(html).toContain('<div class="title">目次</div>');
    expect(html).toContain(">Fold</a>");
    expect(renderToHtml(ast)).toContain('<div class="title">Table of Contents</div>');
  });

  it("lets a catalog reorder an include link while escaping literals and arguments", () => {
    const html = renderToHtml(
      {
        elements: [
          {
            element: "include",
            data: {
              location: { site: null, page: 'Missing<&"' },
              variables: {},
              elements: [],
              "paragraph-safe": false,
            },
          },
        ],
      },
      {
        i18n: {
          locale: "ja",
          messages: {
            "include.missing":
              "<createLink>'<b>'{page}'</b>' を作成</createLink> — '<img src=x>' は存在しません",
          },
        },
      },
    );

    expect(html).toBe(
      '<div class="error-block"><p><a href="/missing%3C%26%22/edit/true">&lt;b&gt;missing&lt;&amp;"&lt;/b&gt; を作成</a> — &lt;img src=x&gt; は存在しません</p></div>',
    );
  });

  it("localizes renderer labels, escapes attribute text and keeps author labels", () => {
    const { ast } = parse(
      [
        "[[module Rate]]",
        "[[module Join]]",
        '[[module Join button="Author join"]]',
        "[[gallery]]",
        "[[user anonymous]]",
        "[[footnote]]Note[[/footnote]]",
        "[[collapsible]]\nBody\n[[/collapsible]]",
        '[[toc title="Author title"]]',
      ].join("\n\n"),
    );
    const html = renderToHtml(ast, {
      i18n: {
        locale: "ja",
        messages: {
          "rate.label": "評価",
          "module.join": "参加",
          "rate.up": '好き"<&',
          "gallery.empty": "画像なし",
          "user.anonymous": "匿名",
          "footnote.title": "脚注",
          "collapsible.show": "開く +",
          "toc.title": "目次",
        },
      },
    });
    expect(html).toContain("評価:&nbsp;");
    expect(html).toContain(">参加</a>");
    expect(html).toContain(">Author join</a>");
    expect(html).toContain('title="好き&quot;&lt;&amp;"');
    expect(html).toContain('<div class="error-block">画像なし</div>');
    expect(html).toContain("匿名");
    expect(html).toContain('<div class="title">脚注</div>');
    expect(html).toContain("開く&nbsp;+");
    expect(html).toContain('<div class="title">Author title</div>');
  });

  it("localizes error sentences including module markup without accepting catalog HTML", () => {
    const { ast } = parse("[[module Missing]]\n\n[[embed]]invalid[[/embed]]");
    const html = renderToHtml(ast, {
      i18n: {
        locale: "ja",
        messages: {
          "module.unknown":
            "<documentationLink>一覧を見る</documentationLink>：<emphasis>{name}</emphasis> は不明です",
          "embed.invalid": "埋め込みなし",
        },
      },
    });
    expect(html).toContain(
      '<a href="https://www.wikidot.com/doc:modules" target="_blank" rel="noopener noreferrer">一覧を見る</a>：<em>Missing</em> は不明です',
    );
    expect(html).toContain('<div class="error-block">埋め込みなし</div>');
  });

  it("falls back on invalid ICU messages through both render APIs", async () => {
    const { ast } = parse("[[toc]]\n\n[[include missing]]");
    for (const invalid of [
      "{",
      "{unknown}",
      "<unknown>text</unknown>",
      "{createLink}",
      "<createLink>{createLink}</createLink>",
    ]) {
      const errors: string[] = [];
      const i18n: RenderI18n = {
        locale: "ja",
        messages: {
          "toc.title": invalid,
          "include.missing": invalid,
        },
        onError: (_error, id) => {
          errors.push(id);
        },
      };
      const plain = renderToHtml(ast);
      expect(renderToHtml(ast, { i18n })).toBe(plain);
      const result = await renderWikitext(
        {
          ast,
          settings: DEFAULT_SETTINGS,
          page: {
            fullName: "test",
            unixName: "test",
            tags: [],
            urlPath: "/test",
          },
        },
        { i18n },
      );
      expect(result.html).toBe(plain);
      expect(errors).toContain("toc.title");
      expect(errors).toContain("include.missing");
    }
  });

  it("does not replace a catalog message after one argument-dependent failure", () => {
    const { ast } = parse("[[include bad]]\n\n[[include good]]");
    const html = renderToHtml(ast, {
      i18n: {
        locale: "ja",
        messages: {
          "include.missing": "{page, select, bad {{unknown}} other {ページ {page}}}",
        },
      },
    });
    expect(html).toContain('Included page "bad" does not exist');
    expect(html).toContain('<div class="error-block"><p>ページ good</p></div>');
  });

  it("keeps caller catalogs independent across concurrent pipeline renders and respects empty translations", async () => {
    const { ast } = parse("[[toc]]");
    const document = {
      ast,
      settings: DEFAULT_SETTINGS,
      page: {
        fullName: "test",
        unixName: "test",
        tags: [],
        urlPath: "/test",
      },
    };
    const results = await Promise.all([
      renderWikitext(document, { i18n: { locale: "ja", messages: { "toc.title": "目次" } } }),
      renderWikitext(document, { i18n: { locale: "fr", messages: { "toc.title": "Sommaire" } } }),
      renderWikitext(document),
      renderWikitext(document, { i18n: { locale: "ja", messages: { "toc.title": "" } } }),
    ]);
    for (const [index, title] of ["目次", "Sommaire", "Table of Contents", ""].entries()) {
      expect(results[index]?.html).toContain(`<div class="title">${title}</div>`);
    }
  });
});
