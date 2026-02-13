import type { Element } from "@wdprlib/ast";
import { text, lineBreak, horizontalRule } from "@wdprlib/ast";

/** Recognize a text node and return an AST text element. */
export function recognizeText(data: string): Element {
  return text(data);
}

/** Recognize a `<br>` tag and return an AST line-break element. */
export function recognizeLineBreak(): Element {
  return lineBreak();
}

/** Recognize an `<hr>` tag and return an AST horizontal-rule element. */
export function recognizeHorizontalRule(): Element {
  return horizontalRule();
}
