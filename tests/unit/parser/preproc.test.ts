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

    // Backslash line concatenation
    [
      "concat:\napple banana \\\nCherry\\\nPineapple \\ grape\nblueberry\n",
      "concat:\napple banana CherryPineapple \\ grape\nblueberry",
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
  test("should apply both whitespace and typography", () => {
    const input = "``Hello...''\r\n\tWorld";
    const result = preprocess(input);
    expect(result).toBe("\u201cHello\u2026\u201d\n    World");
  });
});
