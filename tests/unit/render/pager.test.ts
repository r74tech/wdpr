import { expect, it } from "bun:test";
import type { SyntaxTree } from "@wdprlib/ast";
import { renderToHtml } from "@wdprlib/render";

const tree: SyntaxTree = {
  elements: [
    {
      element: "pager",
      data: {
        currentPage: 5,
        totalPages: 10,
        pages: [1, 3, 4, 5, 6, 7, 10].map((page) => ({ page, href: `/test/tag/jp/p/${page}` })),
      },
    },
  ],
};

it("renders pager state with current page, gaps, and previous/next links", () => {
  const html = renderToHtml(tree);
  expect(html).toContain('<div class="pager">');
  expect(html).toContain('<span class="pager-no">page 5 of 10</span>');
  expect(html).toContain('<span class="current">5</span>');
  expect(html).toContain('<span class="dots">...</span>');
  expect(html).toContain('<a href="/test/tag/jp/p/4">« previous</a>');
  expect(html).toContain('<a href="/test/tag/jp/p/6">next »</a>');
  expect(html).toContain('<a href="/test/tag/jp/p/10">10</a>');
});

it("formats pager labels using the caller's locale catalog", () => {
  const html = renderToHtml(tree, {
    i18n: {
      locale: "ja",
      messages: {
        "pager.info": "ページ {current} / {total}",
        "pager.previous": "« 前",
        "pager.next": "次 »",
      },
    },
  });
  expect(html).toContain("ページ 5 / 10");
  expect(html).toContain(">« 前</a>");
  expect(html).toContain(">次 »</a>");
  expect(html).not.toContain("previous");
});

it("drops unsafe URLs and falls back for invalid pager translations", () => {
  const html = renderToHtml(
    {
      elements: [
        {
          element: "pager",
          data: {
            currentPage: 1,
            totalPages: 2,
            pages: [
              { page: 1, href: "/test/p/1" },
              { page: 2, href: "javascript:alert(1)" },
            ],
          },
        },
      ],
    },
    {
      i18n: { locale: "en", messages: { "pager.next": "<img src=x>" } },
    },
  );
  expect(html).toContain('href=""');
  expect(html).toContain(">next »</a>");
  expect(html).not.toContain("javascript:");
  expect(html).not.toContain("<img");
});
