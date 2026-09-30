import { describe, expect, test } from "bun:test";
import { parse } from "@wdprlib/parser";
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
