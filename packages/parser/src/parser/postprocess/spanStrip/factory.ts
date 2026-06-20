import type { Element } from "@wdprlib/ast";

export function paragraphElement(elements: Element[]): Element {
  return {
    element: "container",
    data: {
      type: "paragraph",
      attributes: {},
      elements,
    },
  };
}

export function spanElement(elements: Element[], attributes: Record<string, string> = {}): Element {
  return {
    element: "container",
    data: {
      type: "span",
      attributes,
      elements,
    },
  };
}
