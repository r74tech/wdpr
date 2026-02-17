import type { Element, TabData } from "@wdprlib/ast";
import type { Element as DomElement } from "domhandler";
import { isTag } from "domhandler";
import type { DecompileContext } from "./context";
import type { ChildrenRecognizer } from "./types-internal";

/**
 * Recognize a `<div class="yui-navset">` element as a tab-view AST element.
 *
 * Tab labels are extracted from `<ul class="yui-nav">` and tab content from
 * `<div class="yui-content">`.
 */
export function recognizeTabView(
  node: DomElement,
  _ctx: DecompileContext,
  rec: ChildrenRecognizer,
): Element {
  const labels: string[] = [];
  const tabs: TabData[] = [];

  // Extract labels: <ul class="yui-nav"><li><a><em>label</em></a></li></ul>
  const nav = findByClass(node, "yui-nav");
  if (nav) {
    for (const li of nav.childNodes) {
      if (!isTag(li) || li.name !== "li") continue;
      const em = findDescendantTag(li, "em");
      if (em) {
        labels.push(getTextContent(em));
      }
    }
  }

  // Extract content: <div class="yui-content"><div>content</div>...</div>
  const content = findByClass(node, "yui-content");
  if (content) {
    let tabIndex = 0;
    for (const child of content.childNodes) {
      if (!isTag(child) || child.name !== "div") continue;
      const label = labels[tabIndex] ?? `Tab ${tabIndex + 1}`;
      const elements = rec(child);
      tabs.push({ label, elements });
      tabIndex++;
    }
  }

  return { element: "tab-view", data: tabs };
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
