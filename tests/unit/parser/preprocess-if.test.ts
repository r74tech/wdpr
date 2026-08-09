import { describe, expect, test } from "bun:test";
import { preprocessIf } from "../../../packages/parser/src/parser/preprocess/expr";

describe("preprocessIf (opener-embedded only)", () => {
  describe("opener-embedded [[#if]] is collapsed", () => {
    test("truthy condition inside a block opener selects the then branch", () => {
      const src = `[[li class="[[#if 1 | folded | unfolded ]]"]]`;
      expect(preprocessIf(src)).toBe(`[[li class="folded"]]`);
    });

    test("falsy condition inside a block opener selects the else branch", () => {
      const src = `[[li class="[[#if 0 | folded | unfolded ]]"]]`;
      expect(preprocessIf(src)).toBe(`[[li class="unfolded"]]`);
    });

    test("two opener-embedded [[#if]] in sequence", () => {
      const src = `[[li class="[[#if 1 | folded | unfolded ]] [[#if 0 | collapse ]]"]]`;
      expect(preprocessIf(src)).toBe(`[[li class="folded "]]`);
    });

    test('[[#if true |  | class="end" ]] empties to space when truthy with empty then', () => {
      const src = `[[div [[#if true |  | class="end" ]] ]]`;
      expect(preprocessIf(src)).toBe(`[[div  ]]`);
    });

    test('[[#if false |  | class="end" ]] selects the else branch', () => {
      const src = `[[div [[#if false |  | class="end" ]] ]]`;
      expect(preprocessIf(src)).toBe(`[[div class="end" ]]`);
    });

    test("missing else branch becomes empty when falsy", () => {
      const src = `[[li class="[[#if 0 | onlythen ]]"]]`;
      expect(preprocessIf(src)).toBe(`[[li class=""]]`);
    });

    test("missing else branch keeps then when truthy", () => {
      const src = `[[li class="[[#if 1 | onlythen ]]"]]`;
      expect(preprocessIf(src)).toBe(`[[li class="onlythen"]]`);
    });

    test("falsy literal `false` (case-insensitive) inside an opener", () => {
      const src = `[[li class="[[#if False | A | B ]]"]]`;
      expect(preprocessIf(src)).toBe(`[[li class="B"]]`);
    });

    test("falsy literal `null` (case-insensitive) inside an opener", () => {
      const src = `[[li class="[[#if NULL | A | B ]]"]]`;
      expect(preprocessIf(src)).toBe(`[[li class="B"]]`);
    });
  });

  describe("top-level [[#if]] is left alone", () => {
    // The inline `ifRule` handles non-opener-embedded `[[#if]]` so that
    // the AST preserves the conditional and its branches as elements.
    test("standalone [[#if]] in body is not collapsed", () => {
      const src = `before [[#if 1 | A | B ]] after`;
      expect(preprocessIf(src)).toBe(src);
    });

    test("[[#if]] inline inside paragraph text is not collapsed", () => {
      const src = `paragraph with [[#if x | yes | no ]] inline`;
      expect(preprocessIf(src)).toBe(src);
    });
  });

  describe("nesting", () => {
    test("nested opener-embedded [[#if]] is resolved innermost-first", () => {
      // outer opener `[[div ...]]` keeps depth > 0 for both inner if's.
      const src = `[[div [[#if [[#if 1 | x | y ]] | A | B ]] ]]`;
      expect(preprocessIf(src)).toBe(`[[div A ]]`);
    });

    test("64 nested expressions are fully resolved", () => {
      const src = nestedIfSource(64);
      expect(preprocessIf(src)).toBe("[[div A ]]");
    });

    test("65 nested expressions are left entirely unchanged", () => {
      const src = nestedIfSource(65);
      expect(preprocessIf(src)).toBe(src);
    });
  });

  describe("safety / no-op cases", () => {
    test("malformed directive (no closing ]]) is left as-is", () => {
      const src = `[[div [[#if 1 | A | B and never closes`;
      expect(preprocessIf(src)).toBe(src);
    });

    test("directive without pipe is left as-is", () => {
      const src = `[[div [[#if 1 ]] ]]`;
      expect(preprocessIf(src)).toBe(src);
    });

    test("[[#if]] inside [[code]] is preserved verbatim even when in an opener-like context", () => {
      const src = `[[code]]\n[[div [[#if 1 | A | B ]]]]\n[[/code]]`;
      expect(preprocessIf(src)).toBe(src);
    });

    test("fast path: source without [[#if substring is returned unchanged", () => {
      const src = `[[#expr 1+1]] and [[span]]hi[[/span]]`;
      expect(preprocessIf(src)).toBe(src);
    });

    test("long sentinel collisions are handled without quadratic growth", () => {
      const src = `[[div ${"\uE000".repeat(50_000)} [[#if 1 | A | B ]] ]]`;
      const startedAt = performance.now();

      const result = preprocessIf(src);

      expect(result).toBe(`[[div ${"\uE000".repeat(50_000)} A ]]`);
      expect(performance.now() - startedAt).toBeLessThan(250);
    });
  });
});

function nestedIfSource(depth: number): string {
  let expression = "1";
  for (let i = 0; i < depth; i++) {
    expression = `[[#if ${expression} | A | B ]]`;
  }
  return `[[div ${expression} ]]`;
}
