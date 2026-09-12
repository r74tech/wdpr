import { describe, expect, it } from "bun:test";
import { parse, tokenize } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { serialize, htmlToAst } from "@wdprlib/decompiler";
const labels = {
  edit: "edit",
  "edit-append": "append",
  "edit-sections": "edit sections",
  history: "history",
  print: "print",
  files: "files",
  tags: "tags",
  source: "view source",
  backlinks: "backlinks",
  talk: "talk",
  delete: "delete",
  rename: "rename",
  "site-tools": "site tools",
  "edit-meta": "edit meta",
  watchers: "watchers",
  parent: "parent",
  "lock-page": "lock page",
};
describe("standalone page buttons", () => {
  it.each(Object.entries(labels))("renders and roundtrips %s", (action, label) => {
    const ast = parse(`[[button ${action}]]`).ast;
    const html = renderToHtml(ast);
    expect(html).toContain(`data-wdpr-page-action="${action}"`);
    expect(html).toContain(`>${label}</a>`);
    expect(parse(serialize(structuredClone(ast))).ast).toEqual(ast);
    expect(renderToHtml(parse(serialize(htmlToAst(html))).ast)).toBe(html);
  });
  it("preserves custom class, text and safe style", () => {
    const html = renderToHtml(
      parse('[[button source text="ページソース" class="custom" style="color: #444"]]').ast,
    );
    expect(html).toContain('class="custom"');
    expect(html).toContain('style="color: #444"');
    expect(html).toContain(">ページソース</a>");
    expect(renderToHtml(parse(serialize(htmlToAst(html))).ast)).toBe(html);
  });
  it("normalizes underscores in action names", () => {
    expect(renderToHtml(parse("[[button edit_append]]").ast)).toContain(
      'data-wdpr-page-action="edit-append"',
    );
  });
  it("keeps the rest of a heading after a multiline directive", () => {
    expect(renderToHtml(parse('+++ before [[button\nedit\ntext="go"]] after').ast)).toContain(
      ">go</a> after</span></h3>",
    );
  });
  it("renders an unknown action as a block error", () => {
    const html = renderToHtml(parse("before [[button unknown]] after").ast);
    expect(html).toContain('<div class="error-block">The button type is not recognized</div>');
    expect(html).not.toContain("<p><div");
  });
  it("leaves raw and code examples literal", () => {
    const html = renderToHtml(
      parse("@@[[button edit]]@@\n\n[[code]]\n[[button edit]]\n[[/code]]").ast,
    );
    expect(html).not.toContain("data-wdpr-page-action");
  });
});

it.each(["", "0"])("uses the defaults for false-like text/class: %s", (value) => {
  const html = renderToHtml(parse(`[[button edit text="${value}" class="${value}"]]`).ast);
  expect(html).toContain('class="wiki-standalone-button"');
  expect(html).toContain(">edit</a>");
});
it("keeps directive-name casing separate from action casing", () => {
  expect(renderToHtml(parse("[[BUTTON edit]]").ast)).toContain('data-wdpr-page-action="edit"');
  expect(renderToHtml(parse("[[button EDIT]]").ast)).toContain("error-block");
  expect(renderToHtml(parse("[[button edit!]]").ast)).toContain("[[button edit!]]");
});
it("roundtrips a multiline label", () => {
  const ast = parse('[[button edit text="first\nsecond"]]').ast;
  expect(renderToHtml(ast)).toContain(">first\nsecond</a>");
  expect(parse(serialize(structuredClone(ast))).ast).toEqual(ast);
  expect(renderToHtml(parse(serialize(htmlToAst(renderToHtml(ast)))).ast)).toBe(renderToHtml(ast));
});

it("keeps unsafe-to-serialize label formatting literal", () => {
  const tree = htmlToAst(
    '<p><a class="wiki-standalone-button" href="#" data-wdpr-page-action="edit">**label**&quot;</a></p>',
  );
  const html = renderToHtml(parse(serialize(tree)).ast);
  expect(html).toContain("**label**");
  expect(html).not.toContain("<strong>");
});
it("filters attributes and CSS instead of emitting active content", () => {
  const html = renderToHtml(
    parse(
      '[[button edit onclick="bad()" style="background:url(javascript:bad())" text="<img src=x>"]]',
    ).ast,
  );
  expect(html).not.toContain("onclick=");
  expect(html).not.toContain("javascript:");
  expect(html).not.toContain("<img");
});

it("preserves decoded attribute backslashes when serialized", () => {
  const ast = parse(String.raw`[[button edit text="C:\\temp"]]`).ast;
  expect(renderToHtml(ast)).toContain(String.raw`C:\temp`);
  expect(parse(serialize(structuredClone(ast))).ast).toEqual(ast);
});

it("ends at the first close even inside a quoted attribute", () => {
  const html = renderToHtml(parse('[[button edit text="one]]two"]]').ast);
  expect(html).toContain('>edit</a>two"]]');
});

it("does not let a comment token consume the first closing bracket", () => {
  const html = renderToHtml(parse('[[button edit text="first\n--]]two"]]').ast);
  expect(html).toContain('>edit</a>two"]]');
});

it.each([false, true])(
  "keeps source offsets and following attributes (compact=%s)",
  (compactTextRuns) => {
    const source = '[[button edit text="前\n--]]後"]] [[span title="a]]b"]]ok[[/span]]';
    for (const trackPositions of [false, true]) {
      const tokens = tokenize(source, { compactTextRuns, trackPositions });
      expect(tokens.map((token) => token.value).join("")).toBe(source);
      const close = tokens.find((token) => token.type === "BLOCK_CLOSE")!;
      expect(
        tokens.find((token) => token.type === "QUOTED_STRING" && token.value === '"a]]b"'),
      ).toBeDefined();
      if (trackPositions) {
        expect(close.position.start).toEqual({ offset: 24, line: 2, column: 3 });
        expect(close.position.end).toEqual({ offset: 26, line: 2, column: 5 });
      }
    }
  },
);

it("bounds successive directives independently", () => {
  const html = renderToHtml(
    parse('[[button edit text="前\n[[button source --]]後"]] [[button print text="印刷"]]').ast,
  );
  expect(html).toContain('>edit</a>後"]] ');
  expect(html).toContain('data-wdpr-page-action="print">印刷</a>');
  expect(html).not.toContain('data-wdpr-page-action="source"');
});

it("uses the first two brackets of a triple close", () => {
  const html = renderToHtml(parse('[[button edit text="one]]]two"]]').ast);
  expect(html).toContain('>edit</a>]two"]]');
});

it("accepts opening brackets in multiline labels", () => {
  const html = renderToHtml(parse('[[button edit text="first\n[[literal"]] after').ast);
  expect(html).toContain(">first\n[[literal</a> after</p>");
});
it("does not use label formatting markers as the enclosing close", () => {
  const html = renderToHtml(parse('**before [[button edit text="first\n**second"]] after**').ast);
  expect(html).toContain(">first\n**second</a> after</strong></p>");
});
