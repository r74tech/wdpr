import type { Element } from "@wdprlib/ast";
import type { AlignDirection } from "./syntax";

export function createAlignElement(direction: AlignDirection, elements: Element[]): Element {
  return {
    element: "container",
    data: {
      type: { align: direction },
      attributes: {},
      elements,
    },
  };
}
