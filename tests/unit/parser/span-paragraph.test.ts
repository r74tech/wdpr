import { expect, test } from "bun:test";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { serialize } from "@wdprlib/decompiler";

const html = (source: string) => renderToHtml(parse(source).ast);

test("keeps the saved empty span example in a paragraph", () => {
  const source = "**出力**\n**オブジェクトクラス:** [[span_]][[/span]]\nEuclid";
  const expected = "<p><strong>出力</strong><br /><strong>オブジェクトクラス:</strong> Euclid</p>";
  expect(html(source)).toBe(expected);
  expect(html(source + '\n\n[[div class="alert alert-info"]]\n説明\n[[/div]]')).toBe(
    expected + '<div class="alert alert-info"><p>説明</p></div>',
  );
  expect(html(serialize(parse(source).ast))).toBe(expected);
});

test.each([
  ["x [[span_]]y[[/span]]\nz", "<p>x <span>y</span>z</p>"],
  ["x [[span_]][[/span]]\n\nz", "<p>x z</p>"],
  ["[[span_]]y[[/span]]\nz", "<span>y</span>z"],
  ["[[span_]]before\n\nafter[[/span]]", "<p><span>before</span></p><span>after</span>"],
  ["x [[span]]y[[/span]]\nz", "<p>x <span>y</span><br />z</p>"],
  ["x _\nz [[span_]][[/span]]\nw", "<p>x<br />z w</p>"],
])("retains strip span merging and ordinary paragraph content: %s", (source, expected) => {
  expect(html(source)).toBe(expected);
});

test.each(["\n", "\n\n"])("keeps ordinary paragraphs beside div blocks: %j", (separator) => {
  const source = `before${separator}[[div]]\ninside\n[[/div]]${separator}after`;
  expect(html(source)).toBe("<p>before</p><div><p>inside</p></div><p>after</p>");
  expect(html(serialize(parse(source).ast))).toBe(html(source));
});

test.each([
  ["[[div]]inline[[/div]]", "<p>[[div]]inline[[/div]]</p>"],
  ["[[div]]inline[[/div]]\n\n[[div]]\ny\n[[/div]]", "[[div]]inline[[/div]]<div><p>y</p></div>"],
  [
    "[[div]]inline[[/div]]\n> quote\n[[div]]\ny\n[[/div]]",
    "<p>[[div]]inline[[/div]]</p><blockquote><p>quote</p></blockquote><div><p>y</p></div>",
  ],
  [
    "[[div]]\nx\n[[/div]]\n[[/div]]\n\n[[div]]\ny\n[[/div]]",
    "<div><p>x</p></div><br />[[/div]]<div><p>y</p></div>",
  ],
  [
    "[[div]]\n[[div]]inline[[/div]]\n[[div]]\ny\n[[/div]]\n[[/div]]",
    "<div><p>[[div]]inline[[/div]]</p><div><p>y</p></div></div>",
  ],
])(
  "preserves malformed div behavior without applying it to nested paragraphs: %s",
  (source, expected) => {
    expect(html(source)).toBe(expected);
    expect(JSON.stringify(parse(source).ast)).not.toContain("unparsedDiv");
  },
);

test.each([
  ["[[#expr ]]\nnormal", "<p>normal</p>"],
  ["[[span]]before\n\nafter[[/span]]", "<p><span>before</span></p><p><span>after</span></p>"],
])("keeps normal fragments after splitting an orphan div paragraph: %s", (content, expected) => {
  expect(html(`[[div]]\nx\n[[/div]]\n[[/div]]\n${content}\n\n[[div]]\ny\n[[/div]]`)).toBe(
    `<div><p>x</p></div><br />[[/div]]${expected}<div><p>y</p></div>`,
  );
});

test("literal div examples do not mark their paragraphs as malformed", () => {
  expect(html("@@[[/div]]@@\n\n[[div]]\nx\n[[/div]]")).toBe(
    '<p><span style="white-space: pre-wrap;">[[/div]]</span></p><div><p>x</p></div>',
  );
  expect(html("[[code]]\n[[span_]][[/span]]\n[[/div]]\n[[/code]]")).toContain(
    "[[span_]][[/span]]\n[[/div]]",
  );
});
