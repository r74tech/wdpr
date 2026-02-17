import type { Element, CollapsibleData } from "@wdprlib/ast";
import type { Element as DomElement } from "domhandler";
import { isTag } from "domhandler";
import type { DecompileContext } from "./context";
import type { ChildrenRecognizer } from "./types-internal";

/**
 * Recognize a `<div class="collapsible-block">` element.
 *
 * Extracts show/hide text, open state, show-top/show-bottom flags,
 * and the collapsible content elements.
 */
export function recognizeCollapsible(
  node: DomElement,
  _ctx: DecompileContext,
  rec: ChildrenRecognizer,
): Element {
  let showText: string | null = null;
  let hideText: string | null = null;
  let startOpen = false;
  let showTop = true;
  let showBottom = false;
  let contentElements: Element[] = [];

  const folded = findByClass(node, "collapsible-block-folded");
  const unfolded = findByClass(node, "collapsible-block-unfolded");

  if (folded) {
    // folded has display:none → start-open
    const style = folded.attribs.style ?? "";
    startOpen = style.includes("display:none") || style.includes("display: none");

    const linkText = extractLinkText(folded);
    if (linkText) {
      showText = cleanCollapsibleLabel(linkText);
    }
  }

  if (unfolded) {
    const content = findByClass(unfolded, "collapsible-block-content");
    if (content) {
      contentElements = rec(content);
    }

    const linkText = extractLinkText(unfolded);
    if (linkText) {
      hideText = cleanCollapsibleLabel(linkText);
    }

    // Determine show-top / show-bottom from unfolded-link positions
    const unfoldedLinks = findAllByClass(unfolded, "collapsible-block-unfolded-link");
    if (unfoldedLinks.length === 2) {
      showTop = true;
      showBottom = true;
    } else if (unfoldedLinks.length === 1) {
      const link = unfoldedLinks[0]!;
      const contentDiv = findByClass(unfolded, "collapsible-block-content");
      if (contentDiv) {
        // link before content → show-top; link after content → show-bottom
        const linkIndex = getChildIndex(unfolded, link);
        const contentIndex = getChildIndex(unfolded, contentDiv);
        showTop = linkIndex < contentIndex;
        showBottom = linkIndex > contentIndex;
      }
    }
  }

  // Check for default values (kept as-is for omission logic in the serializer)
  const isDefaultShow = showText === null || showText === "+ show block";
  const isDefaultHide = hideText === null || hideText === "- hide block";

  const data: CollapsibleData = {
    elements: contentElements,
    attributes: {},
    "start-open": startOpen,
    "show-text": isDefaultShow ? null : showText,
    "hide-text": isDefaultHide ? null : hideText,
    "show-top": showTop,
    "show-bottom": showBottom,
  };

  return { element: "collapsible", data };
}

/** Clean a collapsible label: normalise NBSP, strip leading +/- marker. */
function cleanCollapsibleLabel(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/^[+–-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract the text content of a `.collapsible-block-link` inside a node. */
function extractLinkText(node: DomElement): string | null {
  const link = findByClass(node, "collapsible-block-link");
  if (!link) return null;
  return getTextContent(link);
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

/** Find the first descendant with the given class name (depth-first). */
function findByClass(node: DomElement, className: string): DomElement | null {
  for (const child of node.childNodes) {
    if (!isTag(child)) continue;
    const classes = (child.attribs.class ?? "").split(/\s+/);
    if (classes.includes(className)) return child;
    const found = findByClass(child, className);
    if (found) return found;
  }
  return null;
}

/** Find all direct children with the given class name (non-recursive). */
function findAllByClass(node: DomElement, className: string): DomElement[] {
  const results: DomElement[] = [];
  for (const child of node.childNodes) {
    if (!isTag(child)) continue;
    const classes = (child.attribs.class ?? "").split(/\s+/);
    if (classes.includes(className)) results.push(child);
    // collapsible-block-unfolded-link only appears as direct children
  }
  return results;
}

/** Get the index of a child among tag-only siblings. */
function getChildIndex(parent: DomElement, child: DomElement): number {
  let index = 0;
  for (const c of parent.childNodes) {
    if (c === child) return index;
    if (isTag(c)) index++;
  }
  return -1;
}
