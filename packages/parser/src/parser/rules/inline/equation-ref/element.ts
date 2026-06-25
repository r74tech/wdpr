import type { Element } from "@wdprlib/ast";

export function equationReferenceElement(name: string): Element {
  return {
    element: "equation-reference",
    data: name,
  };
}
