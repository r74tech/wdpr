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

  test("handles many spans across many divs in linear time", () => {
    const unit = '[[div]]\n[[span class="k"]]a\n[[/div]]\nb\n[[/span]]\n\n';
    const { html } = render(unit.repeat(2_000));

    expect(html.match(/<div>/g)).toHaveLength(2_000);
  }, 5_000);
});
