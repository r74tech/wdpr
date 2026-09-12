import { describe, expect, it } from "bun:test";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import { serialize, htmlToAst } from "@wdprlib/decompiler";

describe("note blocks", () => {
  it("renders the reference note with an email link", () => {
    const source = "[[note]]\n更なる情報はこちらへ連絡してください：support@wikidot.com\n[[/note]]";
    const ast = parse(source).ast;
    expect(renderToHtml(ast)).toBe(
      '<div class="wiki-note"><p>更なる情報はこちらへ連絡してください：<a href="mailto:support@wikidot.com">support@wikidot.com</a></p></div>',
    );
    expect(parse(serialize(structuredClone(ast))).ast).toEqual(ast);
    expect(renderToHtml(parse(serialize(htmlToAst(renderToHtml(ast)))).ast)).toBe(
      renderToHtml(ast),
    );
  });

  it("keeps paragraphs before, inside and after the note", () => {
    const html = renderToHtml(parse("before\n[[note]]\nfirst\n\nsecond\n[[/note]]\nafter").ast);
    expect(html).toBe(
      '<p>before</p><div class="wiki-note"><p>first</p><p>second</p></div><p>after</p>',
    );
  });

  it("parses a list and keeps code/raw closing examples inside the note", () => {
    const source =
      "[[note]]\n* item\n\n@@[[/note]]@@\n\n[[code]]\n[[/note]]\n[[/code]]\n[[/note]]\nafter";
    const html = renderToHtml(parse(source).ast);
    expect(html).toContain('<div class="wiki-note"><ul><li>item</li></ul>');
    expect(html).toContain("[[/note]]");
    expect(html).toEndWith("</div><p>after</p>");
  });

  it.each(["[[note]]inline[[/note]]", '[[note class="other"]]\ntext\n[[/note]]'])(
    "does not recognize an invalid opener: %s",
    (source) => {
      expect(renderToHtml(parse(source).ast)).not.toContain('class="wiki-note"');
    },
  );

  it("does not duplicate footnotes or codes when an unclosed note falls back", () => {
    const ast = parse("[[note]]\ntext[[footnote]]one[[/footnote]]\n[[code]]\ncode\n[[/code]]").ast;
    expect(ast.footnotes).toHaveLength(1);
    expect(ast["code-blocks"]).toHaveLength(1);
    expect(renderToHtml(ast)).not.toContain('class="wiki-note"');
  });
});

describe("note boundaries", () => {
  it.each(["[[note]]inline", "[[note]]\nunfinished", "[[/note]]"])(
    "keeps invalid markup in the preceding paragraph: %s",
    (markup) => {
      const html = renderToHtml(parse(`before\n${markup}`).ast);
      expect(html.match(/<p>/g)).toHaveLength(1);
      expect(html).not.toContain('class="wiki-note"');
    },
  );

  it.each(["> body", "* body", "|| body"])("bounds a same-line close after %s", (body) => {
    const html = renderToHtml(parse(`[[note]]\n${body}[[/note]]\nafter`).ast);
    expect(html).toStartWith('<div class="wiki-note">');
    expect(html).toEndWith("</div><p>after</p>");
  });

  it("uses the first close without nesting note openers", () => {
    const html = renderToHtml(
      parse("[[note]]\nfirst\n[[note]]\nsecond[[/note]]\nafter[[/note]]").ast,
    );
    expect(html.match(/class="wiki-note"/g)).toHaveLength(1);
    expect(html).toContain("[[note]]");
    expect(html).toEndWith("</div><p>after[[/note]]</p>");
  });

  it("protects a footnote body without registering it twice", () => {
    const ast = parse("[[note]]\n[[footnote]]a[[/note]]b[[/footnote]]\n[[/note]]\nafter").ast;
    expect(ast.footnotes).toHaveLength(1);
    expect(renderToHtml(ast)).toContain("</div><p>after</p>");
  });

  it("does not protect a close in inline math processed after Note", () => {
    const html = renderToHtml(parse("[[note]]\n[[$ [[/note]] $]]").ast);
    expect(html).toContain('<div class="wiki-note">');
    expect(html).toContain("</div><p>$]]</p>");
  });
});

it.each([
  "[[footnote]]a[[/note]]b[[/footnote\n[[/note]]",
  "[[footnote]]a[[/note]]b",
  "[[footnote]]a[[footnote]]b[[/footnote]]\n[[/note]]\nc[[/footnote]]\n[[/note]]",
])("does not hide the note close with an incomplete or nested footnote: %s", (body) => {
  const html = renderToHtml(parse(`[[note]]\n${body}`).ast);
  expect(html).toStartWith('<div class="wiki-note">');
  expect(html).toMatch(/<\/div><p>[bc]/);
});

it.each(["code", "math"])("does not shield the note close inside an unclosed %s block", (name) => {
  const html = renderToHtml(parse(`[[note]]\n[[${name}]]\nbody[[/note]]\nafter`).ast);
  expect(html).toStartWith('<div class="wiki-note">');
  expect(html).toEndWith("</div><p>after</p>");
});

it("preserves attributes on an ordinary div with the wiki-note class", () => {
  const source = '[[div class="wiki-note" id="target" style="color:red"]]\nbody\n[[/div]]';
  const html = renderToHtml(parse(source).ast);
  expect(renderToHtml(parse(serialize(htmlToAst(html))).ast)).toBe(html);
});

it.each([
  '<div class="wiki-note"><div class="wiki-note"><p>x</p></div></div>',
  '<div class="wiki-note">x</div>',
])("preserves wiki-note HTML that cannot be expressed with note syntax: %s", (html) => {
  expect(renderToHtml(parse(serialize(htmlToAst(html))).ast)).toBe(html);
});

it("does not shield the note close with a truncated math close", () => {
  const html = renderToHtml(parse("[[note]]\n[[math]]\nx\n[[/note]]\nafter\n[[/math").ast);
  expect(html).toStartWith('<div class="wiki-note">');
  expect(html).toContain("</div><p>after");
});

it("protects the entire math body through its first complete closing tag", () => {
  const { ast, diagnostics } = parse(
    "[[note]]\n[[math]]\nx\n[[/math\n[[/note]]\nafter\n[[/math]]\n[[/note]]\nend",
  );
  expect(diagnostics).toEqual([]);
  expect(ast.elements[0]).toMatchObject({
    element: "container",
    data: {
      type: "note",
      elements: [{ element: "math", data: { "latex-source": "x\n[[/math\n[[/note]]\nafter" } }],
    },
  });
  expect(renderToHtml(ast)).toEndWith("</div></div><p>end</p>");
});
