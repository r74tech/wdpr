import type { ContainerData, Element } from "@wdprlib/ast";

/**
 * Implements the `[[div_]]` paragraph-strip behaviour.
 *
 * In Wikidot's `div_` mode, the first and last paragraph containers have
 * their `<p>` wrappers removed, leaving the inner elements bare. Any
 * middle paragraphs retain their wrapping.
 */
export function unwrapEdgeParagraphs(elements: Element[]): Element[] {
  if (elements.length === 0) return elements;

  const result = [...elements];

  const first = result[0];
  if (isParagraphContainer(first)) {
    const inner = first.data.elements;
    result.splice(0, 1, ...inner);
  }

  const lastIdx = result.length - 1;
  const last = result[lastIdx];
  if (lastIdx >= 0 && isParagraphContainer(last)) {
    const inner = last.data.elements;
    result.splice(lastIdx, 1, ...inner);
  }

  return result;
}

type ParagraphContainer = Extract<Element, { element: "container" }> & {
  data: ContainerData & { type: "paragraph" };
};

function isParagraphContainer(el: Element | undefined): el is ParagraphContainer {
  return (
    el !== undefined &&
    el.element === "container" &&
    typeof el.data === "object" &&
    el.data !== null &&
    "type" in el.data &&
    el.data.type === "paragraph"
  );
}
