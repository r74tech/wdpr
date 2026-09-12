import { expect, test } from "bun:test";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { serialize } from "@wdprlib/decompiler";

const anchor = '[[a_ href="/x"]]y[[/a]]';
const htmlAnchor = '<a href="/x">y</a>';
const html = (source: string) => renderToHtml(parse(source).ast);

test.each([
  [`x\n${anchor}z`, `<p>x${htmlAnchor}z</p>`],
  [`x_\n${anchor}z`, `<p>x_${htmlAnchor}z</p>`],
  [`x\n  ${anchor}\nz`, `<p>x${htmlAnchor}z</p>`],
  [`x\n${anchor}\n${anchor}z`, `<p>x${htmlAnchor}${htmlAnchor}z</p>`],
  ['x\n[[anchor_ href="/x"]]y[[/anchor]]z', `<p>x${htmlAnchor}z</p>`],
  [`[[span]]x\n${anchor}z[[/span]]`, `<p><span>x${htmlAnchor}z</span></p>`],
  [`[[span_]]x\n${anchor}z[[/span]]`, `<span>x${htmlAnchor}z</span>`],
  [`[[a href="/outer"]]x\n${anchor}z[[/a]]`, `<p><a href="/outer">x${htmlAnchor}z</a></p>`],
  [`> x\n> ${anchor}z`, `<blockquote><p>x${htmlAnchor}z</p></blockquote>`],
  [`[[div]]\nx\n${anchor}z\n[[/div]]`, `<div><p>x${htmlAnchor}z</p></div>`],
  [`[[div_]]\nx\n${anchor}z\n[[/div]]`, `<div>x${htmlAnchor}z</div>`],
  [
    `[[ul]]\nx\n${anchor}z\n[[/ul]]`,
    `<ul><li style="list-style: none">x${htmlAnchor}z</li></ul><br />`,
  ],
  [`[[ul]]\n[[li]]x\n${anchor}z[[/li]]\n[[/ul]]`, `<ul><li>x${htmlAnchor}z</li></ul><br />`],
])(
  "removes only the automatic newline immediately before a successful strip anchor: %s",
  (source, expected) => {
    expect(html(source)).toBe(expected);
  },
);

test.each([
  [`x _\n${anchor}z`, `<p>x<br />${htmlAnchor}z</p>`],
  [`@@@@\n${anchor}z`, `<p><br />${htmlAnchor}z</p>`],
  [`x\n\n${anchor}z`, `<p>x</p><p>${htmlAnchor}z</p>`],
  [`x\n \n${anchor}z`, `<p>x</p><p>${htmlAnchor}z</p>`],
  [`x\n@@@@${anchor}z`, `<p>x<br />${htmlAnchor}z</p>`],
  [
    `[[a_ href="/outer"]]x _\n@@@@\n${anchor}z[[/a]]`,
    `<p><a href="/outer">x<br />${htmlAnchor}z</a></p>`,
  ],
  [
    `[[ul]]\n[[li]]item[[/li]]x _\n@@@@\n${anchor}z\n[[/ul]]`,
    `<ul><li>itemx<br />${htmlAnchor}z</li></ul><br />`,
  ],
  [
    `||x _\n${anchor}z||`,
    `<table class="wiki-content-table"><tr><td>x<br />${htmlAnchor}z</td></tr></table>`,
  ],
  [
    `[[table]][[row]][[cell]]x\n${anchor}z[[/cell]][[/row]][[/table]]`,
    `<table><tr><td><p>x</p><p>${htmlAnchor}z</p></td></tr></table>`,
  ],
])(
  "preserves explicit breaks and boundaries without a matching automatic break: %s",
  (source, expected) => {
    expect(html(source)).toBe(expected);
  },
);

test("preserves ordinary and unclosed anchor behavior", () => {
  expect(html('x\n[[a href="/x"]]y[[/a]]\nz')).toBe(`<p>x</p><p>${htmlAnchor}<br />z</p>`);
  expect(html('x\n[[a_ href="/x"]]y')).toBe('<p>x<br />[[a_ href="/x"]]y</p>');
  expect(html(`x\n@@${anchor}z@@`)).toBe(
    `<p>x<br /><span style="white-space: pre-wrap;">[[a_&#32;href="/x"]]y[[/a]]z</span></p>`,
  );
  expect(html(`[[code]]\nx\n${anchor}z\n[[/code]]`)).toContain('[[a_ href="/x"]]y[[/a]]z');
});

test("matches the saved greeting and roundtrips without parser metadata", () => {
  const source = 'やぁ、\n[[a_ href="http://ja.scp-wiki.net/"]]SCP財団[[/a]]\nにようこそ！';
  const expected = '<p>やぁ、<a href="http://ja.scp-wiki.net/">SCP財団</a>にようこそ！</p>';
  const ast = parse(source).ast;
  expect(renderToHtml(ast)).toBe(expected);
  expect(JSON.stringify(ast)).not.toContain("stripLeadingLineBreak");
  expect(html(serialize(structuredClone(ast)))).toBe(expected);
});
