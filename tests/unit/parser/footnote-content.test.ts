import { expect, test } from "bun:test";
import { createSettings } from "@wdprlib/ast";
import { serialize } from "@wdprlib/decompiler";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";

const text = (data: string) => ({ element: "text", data });
const paragraph = (data: string) => ({
  element: "container",
  data: { type: "paragraph", attributes: {}, elements: [text(data)] },
});

test("footnotes parse code, quote and tabs without consuming following references", () => {
  const source = `a[[footnote]]intro

[[code]]
code
[[/code]]
> quote

[[tabview]]
[[tab A]]
alpha
[[/tab]]
[[tab B]]
beta
[[/tab]]
[[/tabview]]
[[/footnote]]after[[footnote]]two[[/footnote]]`;
  const { ast, diagnostics } = parse(source);
  expect(diagnostics).toEqual([]);
  expect(ast.footnotes).toEqual([
    [
      text("intro"),
      { element: "code", data: { contents: "code", language: null, name: null } },
      {
        element: "container",
        data: { type: "blockquote", attributes: {}, elements: [paragraph("quote")] },
      },
      {
        element: "tab-view",
        data: [
          { label: "A", elements: [paragraph("alpha")] },
          { label: "B", elements: [paragraph("beta")] },
        ],
      },
    ],
    [text("two")],
  ]);
  const html = renderToHtml(ast);
  expect(html).toContain('>1</a></sup>after<sup class="footnoteref">');
  expect(html).toContain("<pre><code>code</code></pre>");
  expect(html).toContain("<blockquote><p>quote</p></blockquote>");
  expect(html).toContain('<div id="wiki-tab-0-1" style="display:none"><p>beta</p></div>');
  expect(html).toContain('id="footnote-2"><a href="javascript:;">2</a>. two');
  expect(parse(serialize(ast)).ast.footnotes).toEqual(ast.footnotes);
});

test("footnote inline spans and subsequent paragraphs survive decompilation", () => {
  const { ast } = parse(
    'a[[footnote]]note[[span class="br"]]sample[[/span]]\n\nsecond[[/footnote]]after',
  );
  expect(parse(serialize(ast)).ast.footnotes).toEqual(ast.footnotes);
});

test.each(["@@[[/footnote]]@@", "[!-- [[/footnote]] --]"])(
  "protected footnote closing text does not end its body: %s",
  (literal) => {
    const { ast, diagnostics } = parse(`a[[footnote]]${literal}end[[/footnote]]after`);
    expect(diagnostics).toEqual([]);
    expect(ast.footnotes?.[0]?.at(-1)).toEqual(text("end"));
    expect(renderToHtml(ast)).toContain(">1</a></sup>after</p>");
  },
);

test("an unclosed span in a footnote cannot consume the outer span close", () => {
  const { ast, diagnostics } = parse(
    '[[span class="outer"]]before[[footnote]][[span]]inside[[/footnote]]after[[/span]]',
  );
  expect(diagnostics.some((d) => d.message.includes("[[/span]]"))).toBe(true);
  expect(diagnostics.some((d) => d.message.includes("[[/footnote]]"))).toBe(false);
  expect(renderToHtml(ast)).toContain(">1</a></sup>after</span></p>");
  expect(renderToHtml(ast)).toContain("1</a>. [[span]]inside</div>");
});

test("footnote leading blank lines preserve a paragraph, while boundary spaces are trimmed", () => {
  expect(parse("[[footnote]]\n\na[[/footnote]]").ast.footnotes).toEqual([[paragraph("a")]]);
  expect(parse("[[footnote]] a [[/footnote]]").ast.footnotes).toEqual([[text("a")]]);
  expect(parse("[[footnote]]\n> quote\n\na[[/footnote]]").ast.footnotes?.[0]?.at(-1)).toEqual(
    paragraph("a"),
  );
});

test("an unclosed footnote keeps its content and diagnostic", () => {
  const { ast, diagnostics } = parse("a[[footnote]]unclosed");
  expect(ast.footnotes).toEqual([[text("unclosed")]]);
  expect(diagnostics).toHaveLength(1);
  expect(diagnostics[0]?.message).toContain("[[/footnote]]");
});

test.each(["> quote", "|| cell ||", ": term : definition", "----"])(
  "a line-oriented block cannot cross a same-line footnote close: %s",
  (body) => {
    const { ast, diagnostics } = parse(
      `a[[footnote]]\n${body}[[/footnote]]after[[footnote]]two[[/footnote]]`,
    );
    expect(diagnostics).toEqual([]);
    expect(ast.footnotes).toHaveLength(2);
    expect(ast.footnotes?.[1]).toEqual([text("two")]);
    expect(renderToHtml(ast)).toContain('>1</a></sup>after<sup class="footnoteref">');
    expect(parse(serialize(ast)).ast.footnotes).toEqual(ast.footnotes);
  },
);

test.each(["code", "html"])("a footnote close inside %s remains body text", (block) => {
  const { ast, diagnostics } = parse(
    `a[[footnote]]\n[[${block}]]\n[[/footnote]]\n[[/${block}]]\n[[/footnote]]after`,
  );
  expect(diagnostics).toEqual([]);
  expect(ast.footnotes).toHaveLength(1);
  expect(ast.footnotes?.[0]?.[0]?.element).toBe(block);
  expect(renderToHtml(ast)).toContain(">1</a></sup>after</p>");
  const blocks = block === "code" ? ast["code-blocks"] : ast["html-blocks"];
  expect(blocks).toHaveLength(1);
});

test.each(["[[math]]x[[/footnote]][[footnote]]y[[/math]]", "[[$ x[[/footnote]][[footnote]]y $]]"])(
  "math shields footnote opening and closing tags: %s",
  (math) => {
    const { ast, diagnostics } = parse(`a[[footnote]]\n${math}\n[[/footnote]]after`);
    expect(diagnostics).toEqual([]);
    expect(ast.footnotes).toHaveLength(1);
    expect(JSON.stringify(ast.footnotes)).toContain("x[[/footnote]][[footnote]]y");
    expect(renderToHtml(ast)).toContain(">1</a></sup>after</p>");
  },
);

test("an unclosed enabled HTML block does not hide the footnote boundary", () => {
  const { ast, diagnostics } = parse("A[[footnote]]\n[[html]]x[[/footnote]]Z");
  expect(diagnostics).toHaveLength(1);
  expect(diagnostics[0]?.message).toContain("[[/html]]");
  expect(renderToHtml(ast)).toContain(">1</a></sup>Z</p>");
  expect(ast["html-blocks"]).toBeUndefined();
});

test("nested footnote boundaries preserve the existing registration order", () => {
  const { ast, diagnostics } = parse(
    "a[[footnote]]outer[[footnote]]inner[[/footnote]]tail[[/footnote]]after",
  );
  expect(diagnostics).toEqual([]);
  expect(ast.footnotes).toEqual([
    [text("inner")],
    [text("outer"), { element: "footnote" }, text("tail")],
  ]);
  expect(renderToHtml(ast)).toContain(">1</a></sup>after</p>");
});

test.each([
  ["[[html]]hidden[[/footnote]][[/html]]\nend", 1],
  ["[[html]]hidden\n\nend", 2],
])("disabled HTML respects its recovery range inside a footnote: %s", (body, warnings) => {
  const { ast, diagnostics } = parse(`a[[footnote]]\n${body}[[/footnote]]after`, {
    settings: createSettings("draft"),
  });
  expect(diagnostics).toHaveLength(warnings);
  expect(ast["html-blocks"]).toBeUndefined();
  expect(ast.footnotes).toEqual([[text("end")]]);
  expect(renderToHtml(ast)).toContain(">1</a></sup>after</p>");
});

test.each([
  "[https://example.com [[code]]label]",
  "[[[page|[[code]]label]]]",
  "[*https://example.com [[code]]label]",
  "[#anchor [[code]]label]",
  "[https://example.com [[/footnote]]label]",
  "[[[page|[[footnote]]label]]]",
])("link labels cannot change footnote boundaries: %s", (link) => {
  const { ast, diagnostics } = parse(`a[[footnote]]${link}[[/footnote]]after`);
  expect(diagnostics).toEqual([]);
  expect(ast.footnotes).toHaveLength(1);
  expect(ast.footnotes?.[0]).toHaveLength(1);
  expect(ast.footnotes?.[0]?.[0]?.element).toBe("link");
  expect(renderToHtml(ast)).toContain(">1</a></sup>after</p>");
  expect(ast["code-blocks"]).toBeUndefined();
});
