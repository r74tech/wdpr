import type { Element } from "@wdprlib/ast";

export interface BareParagraphState {
  paragraphs: Element[];
  current: Element[];
}

export function createBareParagraphState(): BareParagraphState {
  return {
    paragraphs: [],
    current: [],
  };
}

export function appendBareParagraphElements(state: BareParagraphState, elements: Element[]): void {
  state.current.push(...elements);
}

export function appendBareParagraphText(state: BareParagraphState, text: string): void {
  state.current.push({ element: "text", data: text });
}

export function appendBareParagraphLineBreakIfNeeded(state: BareParagraphState): void {
  if (state.current.length > 0) {
    state.current.push({ element: "line-break" });
  }
}

export function flushBareParagraph(state: BareParagraphState): void {
  if (state.current.length === 0) return;

  while (
    state.current.length > 0 &&
    state.current[state.current.length - 1]?.element === "line-break"
  ) {
    state.current.pop();
  }

  if (state.current.length > 0) {
    state.paragraphs.push({
      element: "container",
      data: {
        type: "paragraph",
        attributes: {},
        elements: state.current,
      },
    });
  }
  state.current = [];
}

export function unwrapSingleBareParagraph(elements: Element[]): Element[] {
  if (elements.length !== 1) return elements;

  const first = elements[0];
  if (first?.element !== "container" || first.data.type !== "paragraph") {
    return elements;
  }
  return first.data.elements;
}
