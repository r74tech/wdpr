import type { Element } from "@wdprlib/ast";

export function createExprElement(expression: string): Element {
  return { element: "expr", data: { expression } };
}

export function createIfElement(
  condition: string,
  thenElements: Element[],
  elseElements: Element[],
): Element {
  return {
    element: "if",
    data: {
      condition,
      // AST shape is fixed by @wdprlib/ast; this is not a Promise-like API.
      // oxlint-disable-next-line unicorn/no-thenable
      then: thenElements,
      else: elseElements,
    },
  };
}

export function createIfExprElement(
  expression: string,
  thenElements: Element[],
  elseElements: Element[],
): Element {
  return {
    element: "ifexpr",
    data: {
      expression,
      // AST shape is fixed by @wdprlib/ast; this is not a Promise-like API.
      // oxlint-disable-next-line unicorn/no-thenable
      then: thenElements,
      else: elseElements,
    },
  };
}
