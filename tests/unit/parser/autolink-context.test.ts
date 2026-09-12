import { expect, test } from "bun:test";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";

const anchor = '<a href="http://example.com/x">http://example.com/x</a>';

test("an autolink stops at its pipe-table cell boundary", () => {
  expect(renderToHtml(parse("||http://example.com/x||tail||").ast)).toBe(
    `<table class="wiki-content-table"><tr><td>${anchor}</td><td>tail</td></tr></table>`,
  );
});

test("an autolink stops at its span and footnote boundaries", () => {
  const { ast, diagnostics } = parse(
    "a[[footnote]][[span]]http://example.com/x[[/span]][[/footnote]]after",
  );
  expect(diagnostics).toEqual([]);
  const html = renderToHtml(ast);
  expect(html).toContain(">1</a></sup>after</p>");
  expect(html).toContain(`<span>${anchor}</span></div>`);
});

test("a new-tab bare URL on the next line preserves the line break", () => {
  expect(renderToHtml(parse("before\n*http://example.com/x").ast)).toBe(
    '<p>before<br /><a href="http://example.com/x" target="_blank" rel="noopener noreferrer">http://example.com/x</a></p>',
  );
});

test.each([
  "@@http://example.com/x@@",
  "@<http://example.com/x>@",
  "[[code]]\nhttp://example.com/x\n[[/code]]",
  "[!-- http://example.com/x --]",
  "[http://example.com/x http://example.com/label]",
])("protected content does not acquire nested links: %s", (source) => {
  const html = renderToHtml(parse(source).ast);
  const linkCount = html.match(/<a /g)?.length ?? 0;
  expect(linkCount).toBe(source.startsWith("[http:") ? 1 : 0);
});

test("many compact text tokens retain every URL and following word", () => {
  const source = "http://x end ".repeat(10_000);
  const html = renderToHtml(parse(source).ast);
  expect(html.match(/<a href="http:\/\/x">http:\/\/x<\/a>/g)).toHaveLength(10_000);
  expect(html.match(/ end/g)).toHaveLength(10_000);
});

test("backslash-separated URLs stay separate", () => {
  expect(renderToHtml(parse("http://x\\http://y").ast)).toBe(
    '<p><a href="http://x">http://x</a>\\<a href="http://y">http://y</a></p>',
  );
});

test.each(["@@hidden@@", "@<hidden>@"])("raw immediately after a URL stays separate: %s", (raw) => {
  expect(renderToHtml(parse(`http://example.com/x${raw}`).ast)).toBe(
    `<p>${anchor}<span style="white-space: pre-wrap;">hidden</span></p>`,
  );
});

test("an incomplete raw marker remains part of a URL", () => {
  expect(renderToHtml(parse("http://x@@tail").ast)).toBe(
    '<p><a href="http://x@@tail">http://x@@tail</a></p>',
  );
});

test("unclosed angle markers across many URLs do not hide a later raw region", () => {
  const source = "http://x@<word ".repeat(8_000) + "\nhttp://x@<hidden>@";
  const html = renderToHtml(parse(source).ast);
  expect(html.match(/href="http:\/\/x@&lt;word"/g)).toHaveLength(8_000);
  expect(html).toContain(
    '<a href="http://x">http://x</a><span style="white-space: pre-wrap;">hidden</span>',
  );
});
