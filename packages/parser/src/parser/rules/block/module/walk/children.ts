import type { Element, ElementOf, ListData } from "@wdprlib/ast";

export type ListElement = ElementOf<"list">;

export function listElement(data: ListData): ListElement {
  return { element: "list", data };
}

export function getGenericElementChildren(element: Element): Element[] | null {
  if (!("data" in element) || !element.data || typeof element.data !== "object") {
    return null;
  }

  const data = element.data as Record<string, unknown>;
  return Array.isArray(data.elements) ? (data.elements as Element[]) : null;
}

export function withGenericElementChildren(element: Element, children: Element[]): Element {
  if (!("data" in element) || !element.data || typeof element.data !== "object") {
    return element;
  }

  const data = element.data as Record<string, unknown>;
  if (!Array.isArray(data.elements)) {
    return element;
  }

  return {
    ...element,
    data: {
      ...data,
      elements: children,
    },
  } as Element;
}
