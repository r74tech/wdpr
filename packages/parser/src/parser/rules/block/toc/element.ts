import type { Alignment, Element } from "@wdprlib/ast";

export function createTocElement(align: Alignment | null, title: string | undefined): Element {
  return {
    element: "table-of-contents",
    data: {
      attributes: title === undefined ? {} : { title },
      align,
    },
  };
}
