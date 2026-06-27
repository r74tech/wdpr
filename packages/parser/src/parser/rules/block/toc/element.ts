import type { Alignment, Element } from "@wdprlib/ast";

export function createTocElement(align: Alignment | null): Element {
  return {
    element: "table-of-contents",
    data: {
      attributes: {},
      align,
    },
  };
}
