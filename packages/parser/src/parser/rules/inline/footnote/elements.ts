import type { Element } from "@wdprlib/ast";

export function buildFootnoteChildren(paragraphs: Element[][]): Element[] {
  const children: Element[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const para = trimLineBreaks(paragraphs[i] ?? []);
    if (para.length === 0) {
      continue;
    }

    if (i === 0) {
      children.push(...para);
    } else {
      children.push({
        element: "container",
        data: {
          type: "paragraph",
          attributes: {},
          elements: para,
        },
      });
    }
  }

  return children;
}

function trimLineBreaks(elements: Element[]): Element[] {
  const result = [...elements];
  while (result.length > 0 && result[0]?.element === "line-break") {
    result.shift();
  }
  while (result.length > 0 && result[result.length - 1]?.element === "line-break") {
    result.pop();
  }
  return result;
}
