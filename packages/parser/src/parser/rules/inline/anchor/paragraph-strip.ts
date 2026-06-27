import type { Element } from "@wdprlib/ast";

export function trimParagraphStripLineBreaks(children: Element[], paragraphStrip: boolean): void {
  if (!paragraphStrip) {
    return;
  }

  while (children.length > 0 && children[0]?.element === "line-break") {
    children.shift();
  }
  while (children.length > 0 && children[children.length - 1]?.element === "line-break") {
    children.pop();
  }
}
