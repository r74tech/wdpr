import type { Element } from "@wdprlib/ast";
import { extractEscapedSpans, removeLineBreaksAroundSpanStrip } from "./escaped";
import { paragraphElement } from "./factory";
import {
  getContainerData,
  hasParagraphStripSpan,
  isContainer,
  isEmptyExpr,
  isSplitSpan,
} from "./predicates";
import { splitParagraphAtBlankLineSpans, splitParagraphAtEmptyExpr } from "./split";

/**
 * Merge and split paragraphs according to Wikidot's `span_` and expr behaviors.
 */
export function mergeSpanStripParagraphs(children: Element[]): Element[] {
  const expandedChildren = expandSplitParagraphs(children);
  const result: Element[] = [];
  let i = 0;

  while (i < expandedChildren.length) {
    const node = expandedChildren[i];

    if (!node || !isContainer(node, "paragraph")) {
      if (node) result.push(node);
      i++;
      continue;
    }

    if (!hasParagraphStripSpan(node)) {
      result.push(node);
      i++;
      continue;
    }

    const paraData = getContainerData(node);
    if (!paraData) {
      result.push(node);
      i++;
      continue;
    }

    const mergedChildren: Element[] = [...paraData.elements];
    i++;

    while (i < expandedChildren.length) {
      const nextPara = expandedChildren[i];
      if (!nextPara || !isContainer(nextPara, "paragraph")) {
        break;
      }

      const nextParaData = getContainerData(nextPara);
      if (!nextParaData) {
        break;
      }

      const hasSpanStrip = hasParagraphStripSpan(nextPara);
      mergedChildren.push(...nextParaData.elements);
      i++;

      if (!hasSpanStrip) {
        const peekNext = expandedChildren[i];
        if (!peekNext || !isContainer(peekNext, "paragraph") || !hasParagraphStripSpan(peekNext)) {
          break;
        }
      }
    }

    const escapedSpans = extractEscapedSpans(mergedChildren);
    removeLineBreaksAroundSpanStrip(mergedChildren);

    if (escapedSpans.length > 0) {
      if (mergedChildren.length > 0) {
        result.push(paragraphElement(mergedChildren));
      }
    } else {
      result.push(...mergedChildren);
    }

    result.push(...escapedSpans);
  }

  return result;
}

function expandSplitParagraphs(children: Element[]): Element[] {
  const expandedChildren: Element[] = [];
  for (const child of children) {
    if (isContainer(child, "paragraph")) {
      const data = getContainerData(child);
      if (data) {
        const split = getParagraphSplitKind(data.elements);
        if (split === "blank-line-span") {
          expandedChildren.push(...splitParagraphAtBlankLineSpans(child));
          continue;
        }
        if (split === "empty-expr") {
          expandedChildren.push(...splitParagraphAtEmptyExpr(child));
          continue;
        }
      }
    }
    expandedChildren.push(child);
  }
  return expandedChildren;
}

function getParagraphSplitKind(elements: Element[]): "blank-line-span" | "empty-expr" | null {
  let hasEmptyExpr = false;
  for (const element of elements) {
    if (isSplitSpan(element)) {
      return "blank-line-span";
    }
    hasEmptyExpr ||= isEmptyExpr(element);
  }
  return hasEmptyExpr ? "empty-expr" : null;
}
