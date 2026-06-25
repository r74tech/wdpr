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
      then: thenElements,
      else: elseElements,
    },
  };
}
