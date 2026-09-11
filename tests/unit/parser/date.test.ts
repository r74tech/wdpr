import { describe, expect, it } from "bun:test";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { serialize, htmlToAst } from "@wdprlib/decompiler";

const examples = [
  [1237135440, "%e %b %Y, %H:%M %Z|agohover", "15 Mar 2009 16:44"],
  [1237135440, "%c", "15 Mar 2009 16:44"],
  [1216153821, null, "15 Jul 2008 20:30"],
  [1216153821, "%d. %m. %Y|agohover", "15 Jul 2008 20:30"],
  [681746400, "James is %O young", "09 Aug 1991 14:00"],
  [1234567890, "%e %B|agohover", "13 Feb 2009 23:31"],
] as const;

describe("date syntax", () => {
  it.each(examples)(
    "renders and roundtrips reference timestamp %d, format %s",
    (timestamp, format, label) => {
      const source = `[[date ${timestamp}${format === null ? "" : ` format="${format}"`}]]`;
      const ast = parse(source).ast;
      const cls = `odate time_${timestamp}${format === null ? "" : ` format_${encodeURIComponent(format)}`}`;
      const html = `<p><span class="${cls}">${label}</span></p>`;
      expect(renderToHtml(ast)).toBe(html);
      expect(parse(serialize(structuredClone(ast))).ast).toEqual(ast);
      expect(renderToHtml(parse(serialize(htmlToAst(html))).ast)).toBe(html);
    },
  );

  it.each([
    "[[date -1]]",
    "[[date 1.5]]",
    "[[date NaN]]",
    "[[date 99999999999999999999]]",
    "[[date 12",
    "[[DATE 12]]",
  ])("keeps invalid date literal: %s", (source) => {
    expect(renderToHtml(parse(source).ast)).not.toContain('class="odate');
  });

  it("does not expand examples in raw or code", () => {
    const html = renderToHtml(
      parse("@@[[date 1237135440]]@@\n\n[[code]]\n[[date 1237135440]]\n[[/code]]").ast,
    );
    expect(html).not.toContain('class="odate');
    expect(html.replaceAll("&#32;", " ").match(/\[\[date 1237135440\]\]/g)).toHaveLength(2);
  });
});

it.each(["[[date\n1237135440]]", '[[date 1237135440\nformat="%c"]]'])(
  "accepts separator newlines: %s",
  (source) => {
    expect(renderToHtml(parse(source).ast)).toContain('class="odate time_1237135440');
  },
);

it("keeps heading content after a date with a separator newline", () => {
  const html = renderToHtml(parse("+++ Minutes [[date\n1237135440]] later").ast);
  expect(html).toContain("15 Mar 2009 16:44</span> later</span></h3>");
});

it("renders malformed Unicode in a format without throwing", () => {
  expect(renderToHtml(parse('[[date 1 format="\ud800"]]').ast)).toContain("format_%EF%BF%BD");
});
