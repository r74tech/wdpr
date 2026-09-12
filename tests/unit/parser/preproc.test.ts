/**
 * Preprocess tests
 */
import { test, expect, describe } from "bun:test";
import { preprocess, whitespace, typography } from "../../../packages/parser/src/parser/preprocess";

describe("whitespace", () => {
  const testCases: [string, string][] = [
    // Tabs to spaces
    ["\tapple\n\tbanana\tcherry\n", "    apple\n    banana    cherry"],

    // DOS and Mac newlines
    [
      "newlines:\r\n* apple\r* banana\r\ncherry\n\r* durian",
      "newlines:\n* apple\n* banana\ncherry\n\n* durian",
    ],

    // Compress multiple newlines (whitespace-only lines become empty)
    [
      "apple\nbanana\n\ncherry\n\n\npineapple\n\n\n\nstrawberry\n\n\n\n\nblueberry\n\n\n\n\n\n",
      "apple\nbanana\n\ncherry\n\npineapple\n\nstrawberry\n\nblueberry",
    ],

    // Mac newlines with compression
    [
      "apple\rbanana\r\rcherry\r\r\rpineapple\r\r\r\rstrawberry\r\r\r\r\rblueberry\r\r\r\r\r\r",
      "apple\nbanana\n\ncherry\n\npineapple\n\nstrawberry\n\nblueberry",
    ],

    // Backslash at end of line → U+E000 marker (line break)
    [
      "concat:\napple banana \\\nCherry\\\nPineapple \\ grape\nblueberry\n",
      "concat:\napple banana \uE000Cherry\uE000Pineapple \\ grape\nblueberry",
    ],

    // Whitespace-only lines
    ["<\n        \n      \n  \n      \n>", "<\n\n>"],

    // Non-standard whitespace (nbsp, figure space)
    ["\u00a0\u00a0\u2007 apple", "    apple"],
  ];

  test.each(testCases)("should substitute whitespace correctly", (input, expected) => {
    expect(whitespace(input)).toBe(expected);
  });

  test("should handle empty string", () => {
    expect(whitespace("")).toBe("");
  });

  test("should handle string with only newlines", () => {
    expect(whitespace("\n\n\n")).toBe("");
  });

  test("should handle null characters", () => {
    expect(whitespace("hello\0world")).toBe("hello world");
  });
});

describe("typography", () => {
  // Basic quote tests
  const quoteTests: [string, string][] = [
    // Double quotes
    ["``hello''", "\u201chello\u201d"],
    ["``world''", "\u201cworld\u201d"],

    // Low double quotes (German style)
    [",,hello''", "\u201ehello\u201d"],

    // Single quotes
    ["`hello'", "\u2018hello\u2019"],

    // Mixed
    ["He said ``hello'' and `bye'", "He said \u201chello\u201d and \u2018bye\u2019"],
  ];

  // Ellipsis tests
  const ellipsisTests: [string, string][] = [
    // Basic ellipsis
    ["...", "\u2026"],
    ["hello...", "hello\u2026"],
    ["...world", "\u2026world"],
    ["hello...world", "hello\u2026world"],

    // Spaced ellipsis
    [". . .", "\u2026"],
    ["hello . . .", "hello \u2026"],
    [". . . world", "\u2026 world"],

    // Edge cases - should not replace (more than 3 dots)
    ["....", "...."],
    [".....", "....."],

    // Multiple ellipses
    ["... ... ...", "\u2026 \u2026 \u2026"],
  ];

  const testCases: [string, string][] = [...quoteTests, ...ellipsisTests];

  test.each(testCases)("should substitute typography correctly", (input, expected) => {
    expect(typography(input)).toBe(expected);
  });
});

describe("preprocess", () => {
  test("nested code attributes follow token delimiter rules", () => {
    expect(preprocess("[[code]]\n[[code foo=[[bar]]\n[[/code]]\n\noutside...")).toBe(
      "[[code]]\n[[code foo=[[bar]]\n[[/code]]\n\noutside…",
    );
    const raw = '[[code]]\n[[code name="[[bar]]"]]\n...\n[[/code]]\ntail...\n[[/code]]';
    expect(preprocess(`${raw}\n\noutside...`)).toBe(`${raw}\n\noutside…`);
  });

  test("whitespace-prefixed code tags do not open nested raw blocks", () => {
    expect(preprocess("[[code]]\n[[ code]]\n[[/code]]\n\noutside...")).toBe(
      "[[code]]\n[[ code]]\n[[/code]]\n\noutside…",
    );
    expect(preprocess("[[ code]]\n...\n[[/code]]")).toBe("[[ code]]\n…\n[[/code]]");
  });

  test("nested code and escaped code closers remain protected through the outer close", () => {
    const raw = "[[code]]\n[[code]]\n...\n[[/code]]\n@<[[/code]]>@\n...\\\nnext\n[[/code]]";
    expect(preprocess(`${raw}\n\n...`)).toBe(`${raw}\n\n…`);
  });

  test("commented-out raw openers do not shield following text", () => {
    expect(preprocess("[!-- [[code]] --]\n\nOutside...\\\nnext")).toBe(
      "[!-- [[code]] --]\n\nOutside…\uE000next",
    );
  });

  test.each([
    "@@日本語... ``quotes''@@",
    "@<日本語... ``quotes''>@",
    "[[code]]\n日本語... ``quotes''\\\nnext\n[[/code]]",
    "[[html]]\n<script>const text = '...';</script>\n[[/html]]",
  ])("preserves raw source in %s", (raw) => {
    expect(preprocess(`...\n\n${raw}\n\n...`)).toBe(`…\n\n${raw}\n\n…`);
  });

  test("raw placeholders do not collide with private-use source characters", () => {
    expect(preprocess("\uE0000\uE001 @@...@@ ...")).toBe("\uE0000\uE001 @@...@@ …");
  });

  test("should apply both whitespace and typography", () => {
    const input = "``Hello...''\r\n\tWorld";
    const result = preprocess(input);
    expect(result).toBe("\u201cHello\u2026\u201d\n    World");
  });
});
