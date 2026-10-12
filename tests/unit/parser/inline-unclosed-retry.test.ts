import { describe, expect, test } from "bun:test";
import { parse } from "@wdprlib/parser";

// Each opener fails without a closing tag and used to be reparsed by every enclosing one.
describe("nested unclosed inline openers", () => {
  test.each([
    ["anchor", "[[a]]".repeat(30)],
    ["if", "[[#if 1|".repeat(30)],
    ["ifexpr", "[[#ifexpr 1|".repeat(30)],
    ["span", "[[span]]".repeat(30)],
    [
      "closed if nested beyond the preprocessor limit",
      "[[#if 1|".repeat(100) + "x" + "]]".repeat(100),
    ],
  ])(
    "parses %s without exponential retries",
    (_name, source) => {
      expect(() => parse(source)).not.toThrow();
    },
    2_000,
  );

  // Inner spans record their failure while the outer body is parsed.
  test("keeps failures recorded inside an outer failing span", () => {
    const source = "[[span]]a".repeat(25);
    const started = performance.now();
    parse(source);
    expect(performance.now() - started).toBeLessThan(2_000);
  });
});
