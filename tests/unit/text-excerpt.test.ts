import { expect, test } from "bun:test";
import { compileTextExcerpt, excerptText, type TextExcerptOptions } from "@wdprlib/ast";

test("regex excerpts select numbered matches and captures across the entire body", () => {
  const text = "前文。説明: 最初。余談。説明： 二番目。末尾。";
  const pattern = "説明[:：]\\s*([^。]*。)";
  expect(excerptText(text, { pattern, group: 1, match: 2 })).toBe("二番目。");
  expect(excerptText(text, { pattern, match: 2 })).toBe("説明： 二番目。");
  expect(excerptText(text, { pattern, group: 1, match: 3 })).toBe("");
  expect(excerptText(text, { pattern: `^${pattern}` })).toBe("");
});

test("compiled excerpts reset matching state and support named captures and flags", () => {
  const extract = compileTextExcerpt({
    pattern: "^item: (?<body>.+)$",
    flags: "im",
    group: "body",
    match: 2,
  });
  expect(extract("ITEM: First\nItem: Second")).toBe("Second");
  expect(extract("item: One\nITEM: Two")).toBe("Two");
  expect(excerptText("前\n後", { pattern: "前(.+)後", flags: "s", group: 1 })).toBe("\n");
});

test("truncation counts graphemes after selecting a capture", () => {
  expect(
    excerptText("説明: か\u3099👨‍👩‍👧‍👦🇯🇵。", { pattern: "説明: (.+)", group: 1, maxLength: 2 }),
  ).toBe("か\u3099👨‍👩‍👧‍👦");
  expect(excerptText("か\u3099👨‍👩‍👧‍👦🇯🇵。", { maxLength: 2 })).toBe("か\u3099👨‍👩‍👧‍👦");
});

test.each<TextExcerptOptions>([
  { pattern: "(" },
  { pattern: String.raw`(a)\1` },
  { pattern: "(?=a)a" },
  { pattern: "a", flags: "g" },
  { pattern: "a", flags: "ii" },
  { pattern: "a", match: 0 },
  { pattern: "a", match: -1 },
  { pattern: "a", match: 1.5 },
  { pattern: "a", match: NaN },
  { pattern: "a", group: 1 },
  { pattern: "a", group: -1 },
  { pattern: "a", group: "constructor" },
  { pattern: "a", maxLength: Infinity },
  { pattern: "a", maxLength: 0 },
  { group: 1 },
])("invalid or unsupported excerpt options fail without throwing: %j", (options) => {
  expect(excerptText("a", options)).toBe("");
});

test("absent optional captures and zero-length matches finish with empty text", () => {
  expect(excerptText("a", { pattern: "a(b)?", group: 1 })).toBe("");
  expect(excerptText("abc", { pattern: "", match: 4 })).toBe("");
  expect(excerptText("abc", { pattern: "", match: 5 })).toBe("");
});

test("pattern, input, match-count and aggregate search budgets fail closed", () => {
  expect(excerptText("x", { pattern: "x".repeat(4097) })).toBe("");
  expect(excerptText("x".repeat(1_000_001), { pattern: "x" })).toBe("");
  expect(excerptText("x", { pattern: "x", match: 10_001 })).toBe("");
  expect(excerptText("x".repeat(100_000), { pattern: "x".repeat(200) })).toBe("");
  expect(excerptText("x".repeat(100_000), { pattern: "x", match: 100 })).toBe("");
});
