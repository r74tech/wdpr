import { expect, test } from "bun:test";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";

test.each([
  ["(´・ω・`)\napostrophe'", "<p>(´・ω・`)<br />apostrophe'</p>"],
  ["`unclosed\n`日本語'", "<p>`unclosed<br />‘日本語’</p>"],
  ["``unclosed\nclose''", "<p>``unclosed<br />close''</p>"],
  [",,unclosed\nclose''", "<p>,,unclosed<br />close''</p>"],
  ["`日本語' and ``English''", "<p>‘日本語’ and “English”</p>"],
])("typography respects physical line boundaries: %s", (source, html) => {
  expect(renderToHtml(parse(source).ast)).toBe(html);
});
