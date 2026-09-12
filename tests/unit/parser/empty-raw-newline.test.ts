import { expect, test } from "bun:test";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { serialize } from "@wdprlib/decompiler";

test.each([
  ["@@@@\ntext", "<p><br />text</p>"],
  ["@@@@\n@@@@\ntext", "<p><br /><br />text</p>"],
  ["> @@@@\n> text", "<blockquote><p><br />text</p></blockquote>"],
  ["[[div]]\n@@@@\ntext\n[[/div]]", "<div><p><br />text</p></div>"],
])("preserves empty-literal leading breaks and their roundtrip: %s", (source, expected) => {
  const ast = parse(source).ast;
  expect(renderToHtml(ast)).toBe(expected);
  expect(JSON.stringify(ast)).not.toContain("_preservedLeadingBreak");
  expect(renderToHtml(parse(serialize(structuredClone(ast))).ast)).toBe(expected);
});

test.each(["@@@@", "@@@@\n", "@@@@\n\n", "@@\n@@"])(
  "keeps a lone empty literal empty: %s",
  (source) => {
    expect(renderToHtml(parse(source).ast)).toBe("");
  },
);

test("does not preserve ordinary blank lines or cross a block boundary", () => {
  expect(renderToHtml(parse("\n\ntext").ast)).toBe("<p>text</p>");
  expect(renderToHtml(parse("@@@@\n\ntext").ast)).toBe("<p>text</p>");
  const ast = parse("@@@@\n+ heading\n\n@@@@\n||~ cell ||").ast;
  expect(
    ast.elements.filter((e) => e.element === "container" && e.data.type === "paragraph"),
  ).toHaveLength(0);
  expect(renderToHtml(ast)).toContain("<th>cell</th>");
});

test.each(["", "\n: term : def"])(
  "removes the temporary break marker from footnote bodies: %s",
  (suffix) => {
    const ast = parse(`text[[footnote]]\n@@@@\nnote${suffix}\n[[/footnote]]`).ast;
    expect(ast.footnotes?.[0]?.[0]).toEqual({ element: "line-break" });
    expect(JSON.stringify(ast)).not.toContain("_preservedLeadingBreak");
    expect(renderToHtml(ast)).toContain(". <br />note");
  },
);

test.each([
  ["* text _\n _\nnext", "<ul><li>text<br /><br />next</li></ul>"],
  [
    "|| text _\n _\nnext ||",
    '<table class="wiki-content-table"><tr><td>text<br /><br />next</td></tr></table>',
  ],
])("retains explicit continuation inside tables and lists: %s", (source, expected) => {
  const ast = parse(source).ast;
  expect(renderToHtml(ast)).toBe(expected);
  expect(renderToHtml(parse(serialize(structuredClone(ast))).ast)).toBe(expected);
});
