import type { Element } from "@wdprlib/ast";
import { processDepths, type DepthList } from "../../../depth";
import type { BlockquoteLine, ParsedBlockquoteLine } from "./lines";

export function buildBlockquoteElements(lines: ParsedBlockquoteLine[]): Element[] {
  const depthTrees = processDepths<null, BlockquoteLine>(null, lines);
  return depthTrees.map(({ list }) => buildBlockquoteElement(list));
}

function buildBlockquoteElement(list: DepthList<null, BlockquoteLine>): Element {
  const children: Element[] = [];
  let currentParagraphChildren: Element[] = [];

  function flushParagraph() {
    if (currentParagraphChildren.length > 0) {
      while (
        currentParagraphChildren.length > 0 &&
        currentParagraphChildren[currentParagraphChildren.length - 1]?.element === "line-break"
      ) {
        currentParagraphChildren.pop();
      }
      if (currentParagraphChildren.length > 0) {
        children.push({
          element: "container",
          data: {
            type: "paragraph",
            attributes: {},
            elements: currentParagraphChildren,
          },
        });
      }
      currentParagraphChildren = [];
    }
  }

  for (const item of list) {
    if (item.kind === "item") {
      if (item.value.elements.length === 0) {
        flushParagraph();
        continue;
      }
      currentParagraphChildren.push(...item.value.elements);
      if (item.value.hasLineBreak) {
        currentParagraphChildren.push({ element: "line-break" });
      }
    } else {
      flushParagraph();
      children.push(buildBlockquoteElement(item.children));
    }
  }

  flushParagraph();

  return {
    element: "container",
    data: {
      type: "blockquote",
      attributes: {},
      elements: children,
    },
  };
}
