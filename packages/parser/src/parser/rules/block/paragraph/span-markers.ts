import type { Element } from "@wdprlib/ast";

/**
 * Process closeSpan markers in inline content.
 *
 * When a `_closeSpan` marker is found, all preceding content is wrapped
 * in a span and the marker itself is omitted.
 */
export function processCloseSpanMarkers(elements: Element[]): Element[] {
  let result: Element[] | null = null;

  for (let i = 0; i < elements.length; i++) {
    const elem = elements[i];
    if (!elem) continue;

    if (isCloseSpanMarker(elem)) {
      if (result === null) {
        result = elements.slice(0, i);
      }
      if (result.length > 0) {
        const spanContent = [...result];
        result.length = 0;
        result.push({
          element: "container",
          data: {
            type: "span",
            attributes: {},
            elements: spanContent,
          },
        });
      }
    } else {
      result?.push(elem);
    }
  }

  return result ?? elements;
}

function isCloseSpanMarker(elem: Element): boolean {
  return (
    elem.element === "container" &&
    elem.data &&
    typeof elem.data === "object" &&
    "type" in elem.data &&
    elem.data.type === "span" &&
    "attributes" in elem.data &&
    typeof elem.data.attributes === "object" &&
    elem.data.attributes !== null &&
    "_closeSpan" in elem.data.attributes
  );
}
