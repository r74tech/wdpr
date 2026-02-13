import type { Element, ListType, ListItem, ListData, DefinitionListItem } from "@wdprlib/ast";
import { list, listItemElements, listItemSubList } from "@wdprlib/ast";
import type { Element as DomElement } from "domhandler";
import { isTag } from "domhandler";
import type { DecompileContext } from "./context";
import type { ChildrenRecognizer } from "./types-internal";

/**
 * Recognize a `<ul>` or `<ol>` element as a list AST element.
 *
 * @param node - The list DOM element
 * @param ctx - Decompilation context
 * @param rec - Children recognizer
 */
export function recognizeList(
  node: DomElement,
  ctx: DecompileContext,
  rec: ChildrenRecognizer,
): Element {
  const type: ListType = node.name === "ol" ? "numbered" : "bullet";
  const items = recognizeListItems(node, ctx, rec);
  return list(type, items);
}

/** Collect all `<li>` children and convert them to list items. */
function recognizeListItems(
  node: DomElement,
  ctx: DecompileContext,
  rec: ChildrenRecognizer,
): ListItem[] {
  const items: ListItem[] = [];
  for (const child of node.childNodes) {
    if (!isTag(child)) continue;
    if (child.name === "li") {
      items.push(recognizeListItem(child, ctx, rec));
    }
  }
  return items;
}

/**
 * Recognize a single `<li>` element.
 *
 * If the `<li>` contains a nested `<ul>`/`<ol>`, it becomes a sub-list item.
 * When text precedes the sub-list, both are combined into a single item.
 */
function recognizeListItem(
  node: DomElement,
  ctx: DecompileContext,
  rec: ChildrenRecognizer,
): ListItem {
  // Check for nested sub-list
  for (const child of node.childNodes) {
    if (isTag(child) && (child.name === "ul" || child.name === "ol")) {
      const subType: ListType = child.name === "ol" ? "numbered" : "bullet";
      const subItems = recognizeListItems(child, ctx, rec);
      const subData: ListData = { type: subType, attributes: {}, items: subItems };

      // Check for text elements preceding the sub-list
      const precedingElements = collectPrecedingElements(node, child, rec);
      if (precedingElements.length > 0) {
        // Text + sub-list: use text as the main item content
        return listItemElements([
          ...precedingElements,
          { element: "list", data: subData } as Element,
        ]);
      }
      return listItemSubList(subData);
    }
  }

  const elements = rec(node);
  return listItemElements(elements);
}

/**
 * Collect AST elements from the children of a node that appear before
 * the given stop element (typically a nested list).
 */
function collectPrecedingElements(
  parent: DomElement,
  stopAt: DomElement,
  rec: ChildrenRecognizer,
): Element[] {
  const elements: Element[] = [];
  for (const child of parent.childNodes) {
    if (child === stopAt) break;
    if (isTag(child)) {
      if (child.name !== "ul" && child.name !== "ol") {
        elements.push(...rec(child));
      }
    } else if (child.type === "text") {
      const data = child.data.trim();
      if (data) {
        elements.push({ element: "text", data: child.data });
      }
    }
  }
  return elements;
}

/**
 * Recognize a `<dl>` element as a definition-list AST element.
 *
 * Pairs consecutive `<dt>` (key) and `<dd>` (value) elements.
 */
export function recognizeDefinitionList(
  node: DomElement,
  _ctx: DecompileContext,
  rec: ChildrenRecognizer,
): Element {
  const items: DefinitionListItem[] = [];
  let currentKey: Element[] = [];
  let currentKeyString = "";

  for (const child of node.childNodes) {
    if (!isTag(child)) continue;
    if (child.name === "dt") {
      currentKey = rec(child);
      currentKeyString = extractText(child);
    } else if (child.name === "dd") {
      const value = rec(child);
      items.push({
        key_string: currentKeyString,
        key: currentKey,
        value,
      });
      currentKey = [];
      currentKeyString = "";
    }
  }

  return { element: "definition-list", data: items };
}

/** Recursively extract plain text content from a DOM element. */
function extractText(node: DomElement): string {
  let result = "";
  for (const child of node.childNodes) {
    if (child.type === "text") {
      result += child.data;
    } else if (isTag(child)) {
      result += extractText(child);
    }
  }
  return result;
}
