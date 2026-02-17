import type { Element } from "@wdprlib/ast";
import type { Element as DomElement } from "domhandler";
import { isTag } from "domhandler";
import type { DecompileContext } from "./context";
import type { ChildrenRecognizer } from "./types-internal";

/**
 * Recognize a `<sup class="footnoteref">` element as a footnote-ref.
 *
 * Extracts the footnote number from the inner `<a>` text.
 */
export function recognizeFootnoteRef(node: DomElement, _ctx: DecompileContext): Element {
  const link = findDescendantTag(node, "a");
  const refText = link ? getTextContent(link) : "1";
  const refNum = parseInt(refText, 10) || 1;
  return { element: "footnote-ref", data: refNum };
}

/**
 * Recognize a `<div class="footnotes-footer">` and extract each footnote's
 * content into the decompilation context.
 *
 * Each `<div class="footnote-footer" id="footnote-N">` is parsed and its
 * content stored in `ctx.footnoteContents` keyed by footnote number.
 *
 * @returns A single footnote-block element
 */
export function recognizeFootnotesFooter(
  node: DomElement,
  ctx: DecompileContext,
  rec: ChildrenRecognizer,
): Element[] {
  for (const child of node.childNodes) {
    if (!isTag(child)) continue;
    const classes = (child.attribs.class ?? "").split(/\s+/);
    if (!classes.includes("footnote-footer")) continue;

    const id = child.attribs.id ?? "";
    const match = id.match(/footnote-(\d+)/);
    const num = match ? parseInt(match[1]!, 10) : 0;
    if (num === 0) continue;

    // Extract content after the <a>N</a>. prefix
    const content = extractFootnoteContent(child, rec);
    ctx.footnoteContents.set(num, content);
  }

  // Return as a footnote-block element
  return [{ element: "footnote-block", data: { title: null } }];
}

/**
 * Extract footnote body content, skipping the leading `<a>N</a>. ` prefix.
 */
function extractFootnoteContent(node: DomElement, rec: ChildrenRecognizer): Element[] {
  const elements: Element[] = [];
  let pastLink = false;
  let pastDotSpace = false;

  for (const child of node.childNodes) {
    if (!pastLink) {
      if (isTag(child) && child.name === "a") {
        pastLink = true;
        continue;
      }
      continue;
    }

    if (!pastDotSpace) {
      if (child.type === "text") {
        // Skip the ". " separator after the link number
        const data = child.data.replace(/^\.\s*/, "");
        if (data) {
          elements.push({ element: "text", data });
        }
        pastDotSpace = true;
        continue;
      }
    }

    if (isTag(child)) {
      elements.push(...rec(child));
    } else if (child.type === "text") {
      const data = child.data;
      if (data.trim()) {
        elements.push({ element: "text", data });
      }
    }
  }

  return elements;
}

/** Find the first descendant element with a specific tag name. */
function findDescendantTag(node: DomElement, tagName: string): DomElement | null {
  for (const child of node.childNodes) {
    if (isTag(child)) {
      if (child.name === tagName) return child;
      const found = findDescendantTag(child, tagName);
      if (found) return found;
    }
  }
  return null;
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
