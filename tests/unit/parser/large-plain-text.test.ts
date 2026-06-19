import { describe, expect, test } from "bun:test";
import { parse } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";

function largePlainText(): string {
  const line = "payload {$name} {$missing} 0123456789abcdefghijklmnopqrstuvwxyz\n";
  return line.repeat(Math.ceil(120_000 / line.length)).slice(0, 120_000);
}

describe("large plain text fast path", () => {
  test("parses large variable-looking plain text without full syntax markers", () => {
    const ast = parse(largePlainText()).ast;

    expect(ast.elements.at(-1)?.element).toBe("footnote-block");
    expect(renderToHtml(ast)).toContain("payload {$name} {$missing}");
  });

  test("falls back to normal parser when wikitext syntax candidates are present", () => {
    const source = `${largePlainText()}\n[[div]]\ninside\n[[/div]]`;
    const ast = parse(source).ast;

    expect(renderToHtml(ast)).toContain("<div>");
  });
});
