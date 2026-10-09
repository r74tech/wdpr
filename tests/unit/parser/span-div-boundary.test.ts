import { describe, expect, test } from "bun:test";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";

function render(source: string): { html: string; messages: string[] } {
  const { ast, diagnostics } = parse(source);
  return { html: renderToHtml(ast), messages: diagnostics.map((d) => d.message) };
}

describe("span crossing div boundaries", () => {
  test("closes the div that the span opened in", () => {
    const { html, messages } = render("[[div]]\n[[span]]a\n[[/div]]\n[[/span]]");

    expect(html).toBe("<div><p><span>a</span></p></div><p><span><br /></span></p>");
    expect(messages).toEqual([]);
  });

  test("keeps divs balanced when a stray [[/span]] appears much later", () => {
    const filler = "[[div]]\nx\n[[/div]]\n".repeat(20);
    const source = `[[div]]\n[[span]]a\n[[/div]]\n${filler}[[/span]]`;
    const { html, messages } = render(source);

    expect(html).not.toContain("[[");
    expect(html.match(/<div>/g)).toHaveLength(21);
    expect(messages).toEqual([]);
  });

  test("reopens the span with its attributes inside a following div", () => {
    const { html } = render('[[span class="k"]]e\n[[div]]\nf\n[[/div]]\ng[[/span]]');

    expect(html).toBe(
      '<p><span class="k">e</span></p><div><p><span class="k">f</span></p></div>' +
        '<p><span class="k"><br />g</span></p>',
    );
  });

  test("ignores [[/div]] inside a code block", () => {
    const { html } = render(
      "[[div]]\n[[span]]a\n[[code]]\n[[/div]]\n[[/code]]\nb[[/span]]\n[[/div]]",
    );

    expect(html.startsWith("<div><p><span>a")).toBe(true);
    expect(html.match(/<div>/g)).toHaveLength(1);
  });

  // Wikidot handles span_ in a separate rule whose body hides [[/div]] from Div.
  test("does not split span_", () => {
    const { html } = render("[[div]]\n[[span_]]a\n[[/div]]\nb\n[[/span]]");

    expect(html).toContain("[[/div]]");
  });

  test("counts indented nested divs", () => {
    const { html } = render("[[div]]\n[[span]]a\n [[div]]\nb\n[[/div]]\nc[[/span]]\n[[/div]]");

    expect(html).toBe(
      "<div><p><span>a</span></p><div><p><span>b</span></p></div>" +
        "<p><span><br />c</span></p></div>",
    );
  });

  test("pairs [[/span]] with an inner span_ before the outer span", () => {
    const source = "[[span class=outer]]a[[span_]]b\n[[div]]\nc[[/span]]\n[[/div]]\nd[[/span]]";
    const { html } = render(source);

    expect(html.match(/class="outer"/g)).toHaveLength(1);
  });

  test("finds the footnote close outside raw text", () => {
    const source =
      "[[span class=k]]a[[footnote]]@@[[/footnote]]@@\n[[div]]\nb\n[[/div]]\n[[/footnote]]c[[/span]]";
    const { html, messages } = render(source);

    expect(html).toContain("<div><p>b</p></div>");
    expect(messages).toEqual([]);
  });

  test("ignores div tags inside an html block", () => {
    const source =
      "[[div]]\n[[span class=k]]a\n[[html]]\n[[/div]]\n[[/html]]\nb[[/span]]\n[[/div]]";
    const { html } = render(source);

    expect(html.match(/class="k"/g)).toHaveLength(1);
  });

  test("does not treat an inline [[html]] as a block", () => {
    const source = "[[div]]\n[[span class=k]]a x[[html]][[/span]][[/html]]\n[[/div]]\nb[[/span]]";
    const { html } = render(source);

    expect(html.endsWith("<p>b</p>")).toBe(true);
  });

  test("keeps the span when an unclosed [[html]] follows", () => {
    const source = "[[span class=k]]a\n[[div]]\nb\n[[html]]\nc[[/span]]\n[[/div]]";
    const { html } = render(source);

    expect(html).toContain('<div><p><span class="k">b<br />[[html]]<br />c</span></p></div>');
  });

  test("skips repeated unclosed footnotes in linear time", () => {
    const source = "[[span]]a[[/span]]\n" + "[[footnote x]]".repeat(16_000);

    expect(() => parse(source)).not.toThrow();
  }, 1_000);

  test("handles many spans across many divs in linear time", () => {
    const unit = '[[div]]\n[[span class="k"]]a\n[[/div]]\nb\n[[/span]]\n\n';
    const { html } = render(unit.repeat(2_000));

    expect(html.match(/<div>/g)).toHaveLength(2_000);
  }, 5_000);
});
