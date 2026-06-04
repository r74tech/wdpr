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
import type { Element } from "@wdprlib/ast";

function parseAst(src: string): ReturnType<typeof parse>["ast"] {
  return parse(src).ast;
}

function collectByElement(elements: readonly Element[], name: string): Element[] {
  const out: Element[] = [];
  const visit = (els: readonly Element[]): void => {
    for (const el of els) {
      if (el.element === name) out.push(el);
      const data = (el as { data?: unknown }).data as { elements?: readonly Element[] } | undefined;
      if (data && Array.isArray(data.elements)) visit(data.elements);
    }
  };
  visit(elements);
  return out;
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

    it("nested [[footnoteblock]] inside [[div]] does not leak to outer scope", () => {
      // The inner footnoteblock runs in a child scope (parseBlocksUntil
      // spreads ctx for the div body). With per-scope semantics, the
      // outer scope's flag stays false, so a subsequent top-level
      // [[footnoteblock]] still emits its own footnote-block. The
      // refactor must preserve this pre-existing behaviour.
      const ast = parseAst("[[div]]\n[[footnoteblock]]\n[[/div]]\n\n[[footnoteblock]]");
      const fbs = collectByElement(ast.elements, "footnote-block");
      expect(fbs.length).toBe(2);
    });
  });

  describe("divClosesBudget", () => {
    it("balanced nested div opens parse successfully (inner container present)", () => {
      // The scope group must propagate the budget into the nested div
      // body so the inner [[div]] still opens. Drilling into the outer
      // container's `elements` proves the inner container survives.
      const ast = parseAst("[[div]]\nA\n[[div]]\nB\n[[/div]]\nC\n[[/div]]");
      const containers = collectByElement(ast.elements, "container");
      // Outer + inner div + possibly inner paragraphs — at least 2 containers.
      const divContainers = containers.filter((c) => {
        const data = (c as { data?: { type?: unknown } }).data;
        return data?.type === "div" || data?.type === "div_";
      });
      expect(divContainers.length).toBe(2);
    });

    it("unbalanced excess opens become text (budget enforcement)", () => {
      // Two opens and one close: the innermost excess open must become
      // text, not a successful container. Confirms divClosesBudget is
      // threaded through the scope group correctly.
      const ast = parseAst("[[div]]\n[[div]]\nbody\n[[/div]]");
      const containers = collectByElement(ast.elements, "container");
      const divContainers = containers.filter((c) => {
        const data = (c as { data?: { type?: unknown } }).data;
        return data?.type === "div" || data?.type === "div_";
      });
      // Exactly one [[div]] container survives; the inner excess open
      // becomes text inside the outer container's body.
      expect(divContainers.length).toBe(1);
    });
  });
});
