import type { Element } from "@wdprlib/ast";
import { spanElement } from "./factory";
import { getContainerData, isEscapedSpan, isSpanStripMarker, type InternalContainerData } from "./predicates";

export function extractEscapedSpans(children: Element[]): Element[] {
  const escaped: Element[] = [];

  let firstEscapedIndex = -1;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child && isEscapedSpan(child)) {
      firstEscapedIndex = i;
      break;
    }
  }

  if (firstEscapedIndex === -1) {
    return escaped;
  }

  let currentSpanChildren: Element[] = [];

  for (let i = firstEscapedIndex; i < children.length; i++) {
    const child = children[i];
    if (!child) continue;

    if (isEscapedSpan(child)) {
      if (currentSpanChildren.length > 0) {
        escaped.push(spanElement(currentSpanChildren));
        currentSpanChildren = [];
      }
      escaped.push(child);
    } else if (isSpanStripMarker(child)) {
      const childData = getContainerData(child);
      if (childData) {
        escaped.push(spanElement(childData.elements, childData.attributes));
      }
    } else {
      currentSpanChildren.push(child);
    }
  }

  if (currentSpanChildren.length > 0) {
    escaped.push(spanElement(currentSpanChildren));
  }

  children.splice(firstEscapedIndex);

  return escaped;
}

export function removeLineBreaksAroundSpanStrip(children: Element[]): void {
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    if (!child) continue;

    if (child.element === "line-break") {
      const prev = children[i - 1];
      const next = children[i + 1];
      if (isSpanStripMarker(prev) || isSpanStripMarker(next)) {
        children.splice(i, 1);
        continue;
      }
    }

    if (child.element === "container") {
      const data = child.data as InternalContainerData;
      if (data.type === "span" && data._emptyParagraphStrip) {
        children.splice(i, 1);
      }
    }
  }
}
