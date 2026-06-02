/**
 * Regression tests for ParseContext per-scope semantics.
 *
 * After grouping the per-scope fields into `ctx.scope`, the observable
 * behaviour for `footnoteBlockParsed` and `divClosesBudget` must match
 * the pre-refactor parser: top-level mutations stick, but mutations
 * inside a child scope spread do not leak back to the parent.
 */

import { describe, expect, it } from "bun:test";
import { parse } from "@wdprlib/parser";

function parseAst(src: string): ReturnType<typeof parse>["ast"] {
  return parse(src).ast;
}

describe("ParseContext.scope - per-scope semantics", () => {
  describe("footnoteBlockParsed", () => {
    it("a single [[footnoteblock]] produces exactly one footnote-block", () => {
      const ast = parseAst("text\n\n[[footnoteblock]]");
      const fbs = ast.elements.filter((el) => el.element === "footnote-block");
      expect(fbs.length).toBe(1);
    });

    it("two top-level [[footnoteblock]] only emit one (top-level mutation sticks)", () => {
      // The first occurrence mutates the parser's main ctx scope; the
      // second sees the flag set and falls through to text.
      const ast = parseAst("[[footnoteblock]]\n\n[[footnoteblock]]");
      const fbs = ast.elements.filter((el) => el.element === "footnote-block");
      expect(fbs.length).toBe(1);
    });
  });

  describe("divClosesBudget", () => {
    it("balanced nested div opens parse successfully", () => {
      // Smoke check: the scope group correctly propagates the budget into
      // the nested div body so the inner [[div]] can still open.
      const ast = parseAst("[[div]]\nA\n[[div]]\nB\n[[/div]]\nC\n[[/div]]");
      const containers = ast.elements.filter((el) => el.element === "container");
      expect(containers.length).toBeGreaterThanOrEqual(1);
    });

    it("unbalanced excess opens become text (budget enforcement)", () => {
      // Two opens and one close: the innermost excess open must become
      // text, not a successful container. Confirms divClosesBudget is
      // threaded through the scope group correctly.
      const ast = parseAst("[[div]]\n[[div]]\nbody\n[[/div]]");
      // Exactly one container survives; the other [[div]] becomes text.
      const containers = ast.elements.filter((el) => el.element === "container");
      expect(containers.length).toBe(1);
    });
  });
});
