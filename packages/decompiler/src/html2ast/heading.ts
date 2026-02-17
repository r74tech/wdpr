import type { Element, HeadingLevel } from "@wdprlib/ast";
import { heading } from "@wdprlib/ast";
import type { Element as DomElement } from "domhandler";
import { isTag } from "domhandler";
import type { DecompileContext } from "./context";
import type { ChildrenRecognizer } from "./types-internal";

/**
 * Recognize an `<h1>`–`<h6>` element as a heading container.
 *
 * The heading level is derived from the tag name. A `toc`-prefixed `id`
 * attribute indicates that the heading participates in the table of contents.
 * Wikidot wraps heading content in a `<span>`, which is unwrapped here.
 */
export function recognizeHeading(
  node: DomElement,
  ctx: DecompileContext,
  rec: ChildrenRecognizer,
): Element {
  const levelStr = node.name.charAt(1);
  const level = parseInt(levelStr, 10) as HeadingLevel;
  const id = node.attribs.id ?? "";
  const hasToc = /^toc\d+/.test(id);

  if (hasToc) {
    ctx.nextTocIndex();
  }

  // Wikidot wraps heading content in <span>; unwrap it
  const innerChildren = unwrapSpan(node);
  const elements = innerChildren.flatMap((child) => {
    if (isTag(child)) {
      return rec(child);
    }
    if (child.type === "text") {
      const data = child.data;
      if (data.trim() === "") return [];
      return [{ element: "text" as const, data }];
    }
    return [];
  });

  return heading(level, elements, hasToc);
}

/**
 * Unwrap the `<span>` that Wikidot uses inside headings.
 *
 * Returns the span's children if found, otherwise the heading's direct children.
 */
function unwrapSpan(node: DomElement): import("domhandler").ChildNode[] {
  for (const child of node.childNodes) {
    if (isTag(child) && child.name === "span") {
      return child.childNodes;
    }
  }
  return node.childNodes;
}
