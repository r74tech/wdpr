import { describe, expect, test } from "bun:test";
import { createSettings } from "@wdprlib/ast";
import { Parser, parse, tokenize } from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";

describe("span with formatting across its closing tag", () => {
  // Each unit leaves `**` open across [[/span]]; before failed spans were cached,
  // parsing retried every unclosed span 2^n - 1 times.
  test("parses repeated units without exponential retries", () => {
    const unit = '[[span class="a"]]**X[[/span]][[span class="b"]]:** [[/span]]\n\n';
    const ast = parse(unit.repeat(40)).ast;

    expect(renderToHtml(ast)).toContain("X");
  }, 5_000);
});

describe("span failures cached for one token array", () => {
  // Disabled HTML consumes the span close, so a draft failure must not apply to a page parse.
  test("are not reused under different settings", () => {
    const tokens = tokenize("prefix [[span]] [[html]] [[/span]] [[/html]]");
    new Parser(tokens, { settings: createSettings("draft") }).parse();
    const { ast } = new Parser(tokens, { settings: createSettings("page") }).parse();

    expect(renderToHtml(ast)).toContain("<span>");
  });
});
