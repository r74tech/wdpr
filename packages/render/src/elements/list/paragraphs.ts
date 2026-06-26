import type { ContainerData, Element } from "@wdprlib/ast";

export type ParagraphElement = Element & {
  element: "container";
  data: ContainerData & { type: "paragraph" };
};

export function getParagraphIndices(elements: Element[]): number[] {
  const indices: number[] = [];

  for (let i = 0; i < elements.length; i++) {
    if (isParagraphElement(elements[i])) {
      indices.push(i);
    }
  }

  return indices;
}

export function isParagraphElement(element: Element | undefined): element is ParagraphElement {
  return element?.element === "container" && element.data.type === "paragraph";
}

export function isLiCloseTextParagraph(element: ParagraphElement): boolean {
  let combined = "";

  for (const child of element.data.elements) {
    if (child.element === "text") {
      combined += child.data;
    }
  }

  return combined.trim() === "[[/li]]";
}
