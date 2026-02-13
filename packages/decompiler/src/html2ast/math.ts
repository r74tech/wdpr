import type { Element, MathData, MathInlineData } from "@wdprlib/ast";
import type { Element as DomElement } from "domhandler";
import { isTag } from "domhandler";

/**
 * Recognize a `<div class="math-block">` element as a block math AST element.
 *
 * The LaTeX source is extracted from the `<code class="math-source">` child.
 * An optional `data-name` attribute is preserved for equation references.
 */
export function recognizeMathBlock(node: DomElement): Element {
  const source = findMathSource(node);
  const name = node.attribs["data-name"] ?? null;

  const data: MathData = {
    name,
    "latex-source": source,
  };

  return { element: "math", data };
}

/**
 * Recognize a `<span class="math-inline">` element as an inline math AST element.
 *
 * The LaTeX source is extracted from the `<code class="math-source">` child.
 */
export function recognizeMathInline(node: DomElement): Element {
  const source = findMathSource(node);

  const data: MathInlineData = {
    "latex-source": source,
  };

  return { element: "math-inline", data };
}

/** Find and extract the text content of a `<code class="math-source">` child. */
function findMathSource(node: DomElement): string {
  for (const child of node.childNodes) {
    if (!isTag(child)) continue;
    if (child.name === "code" && (child.attribs.class ?? "").includes("math-source")) {
      return getTextContent(child);
    }
  }
  return "";
}

/** Recursively extract text content from a DOM subtree. */
function getTextContent(node: DomElement): string {
  let result = "";
  for (const child of node.childNodes) {
    if (child.type === "text") {
      result += child.data;
    } else if (isTag(child)) {
      result += getTextContent(child);
    }
  }
  return result;
}
