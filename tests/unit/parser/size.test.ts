import { expect, test } from "bun:test";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";

test.each(["", "\n"])(
  "parses nested spans inside bold size content with separator %j",
  (newline) => {
    for (const text of ["Sample", "例文"]) {
      const result = parse(
        `[[size 200%]]${newline}**／[[span class="outer"]] ${text}[[span class="inner"]]annotation[[/span]][[/span]]！＼**${newline}[[/size]]`,
      );
      expect(result.diagnostics).toEqual([]);
      expect(renderToHtml(result.ast)).toBe(
        `<p><span style="font-size:200%;">${newline}<strong>／<span class="outer"> ${text}<span class="inner">annotation</span></span>！＼</strong>${newline}</span></p>`,
      );
    }
  },
);

test.each([
  [
    "[[size 200%]]outer [[size 50%]][[span]]inner[[/span]][[/size]] tail[[/size]]",
    '<p><span style="font-size:200%;">outer <span style="font-size:50%;"><span>inner</span></span> tail</span></p>',
  ],
  [
    "[[size 200%]]@@[[/size]]@@ [[span]]text[[/span]][[/size]]",
    '<p><span style="font-size:200%;"><span style="white-space: pre-wrap;">[[/size]]</span> <span>text</span></span></p>',
  ],
  ["[[size 200%]][[/size]]", '<p><span style="font-size:200%;"></span></p>'],
  [
    "[[size 200%]][[size 50%]]a\nb[[/size]]c[[/size]]",
    '<p><span style="font-size:200%;"><span style="font-size:50%;">a\nb</span>c</span></p>',
  ],
])("preserves size nesting and literal closing tags: %s", (source, expected) => {
  const result = parse(source);
  expect(result.diagnostics).toEqual([]);
  expect(renderToHtml(result.ast)).toBe(expected);
});

test("reports an unclosed size without losing its parsed span", () => {
  const result = parse("[[size 200%]][[span]]text[[/span]]");
  expect(result.diagnostics.map(({ code }) => code)).toEqual(["unclosed-block"]);
  expect(renderToHtml(result.ast)).toBe(
    '<p><span style="font-size:200%;"><span>text</span></span></p>',
  );
});

test.each(["**", "//"])("keeps %s formatting inside its enclosing size boundary", (marker) => {
  const result = parse(`[[size 200%]]${marker}inside[[/size]] outside${marker} tail`);
  expect(result.diagnostics).toEqual([]);
  expect(renderToHtml(result.ast)).toBe(
    `<p><span style="font-size:200%;">${marker}inside</span> outside${marker} tail</p>`,
  );
});

test("preserves comment whitespace handling inside size", () => {
  const result = parse("[[size 200%]]a [!-- [[/size]] --]\nb[[/size]]");
  expect(result.diagnostics).toEqual([]);
  expect(renderToHtml(result.ast)).toBe('<p><span style="font-size:200%;">a\nb</span></p>');
});

test("keeps size inside its table cell instead of dropping the cell content", () => {
  const result = parse("||[[size 200%]]a||");
  expect(result.diagnostics.map(({ code }) => code)).toEqual(["unclosed-block"]);
  expect(renderToHtml(result.ast)).toBe(
    '<table class="wiki-content-table"><tr><td><span style="font-size:200%;">a</span></td></tr></table>',
  );
});

test("stops size at the list item boundary", () => {
  const result = parse("* [[size 200%]]a\n* b[[/size]]");
  expect(result.diagnostics.map(({ code }) => code)).toEqual(["unclosed-block"]);
  expect(renderToHtml(result.ast)).toBe(
    '<ul><li><span style="font-size:200%;">a</span></li><li>b[[/size]]</li></ul>',
  );
});
