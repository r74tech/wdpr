import type { Element, ContainerType, AttributeMap } from "@wdprlib/ast";
import { container } from "@wdprlib/ast";
import type { Element as DomElement } from "domhandler";
import type { ChildrenRecognizer } from "./types-internal";
import { hasOnlyStyleProperty, getStyleValue, getTextContent } from "./utils";

/**
 * Create a container element with a type not included in {@link ContainerType}.
 *
 * The render side switches on the type as a string, so the value is valid
 * at runtime even though it is not statically typed.
 */
function containerUnchecked(
  type: string,
  elements: Element[],
  attributes: AttributeMap = {},
): Element {
  return container(type as ContainerType, elements, attributes);
}

/** Recognize a `<p>` element as a paragraph container. */
export function recognizeParagraph(node: DomElement, rec: ChildrenRecognizer): Element {
  const attrs = extractAttributes(node, []);
  const elements = rec(node);
  return container("paragraph", elements, attrs);
}

/**
 * Recognize an inline formatting element (bold, italics, monospace, etc.).
 *
 * @param node - The DOM element
 * @param type - The container type string (e.g. `"bold"`, `"italics"`)
 * @param rec - Children recognizer
 */
export function recognizeInlineFormat(
  node: DomElement,
  type: string,
  rec: ChildrenRecognizer,
): Element {
  const attrs = extractAttributes(node, ["style"]);
  const elements = rec(node);
  return containerUnchecked(type, elements, attrs);
}

/**
 * Recognize a `<span>` element and map it to the appropriate AST container.
 *
 * Handles underline, strikethrough (via `text-decoration`), size
 * (via `font-size`), raw text (via `white-space: pre-wrap`), and
 * hidden/invisible spans.
 *
 * @returns The recognised element, or `null` if the span should fall through
 *          to a generic span container.
 */
export function recognizeSpanContainer(node: DomElement, rec: ChildrenRecognizer): Element | null {
  const style = node.attribs.style ?? "";

  // text-decoration only → underline / strikethrough
  if (hasOnlyStyleProperty(style, "text-decoration")) {
    const value = getStyleValue(style, "text-decoration")!;
    if (value === "underline") {
      return recognizeInlineFormat(node, "underline", rec);
    }
    if (value === "line-through") {
      return recognizeInlineFormat(node, "strikethrough", rec);
    }
  }

  // font-size only → [[size]]
  if (hasOnlyStyleProperty(style, "font-size")) {
    const attrs = extractAttributes(node, []);
    const elements = rec(node);
    return container("size", elements, attrs);
  }

  // white-space only with pre-wrap → @@raw@@
  if (hasOnlyStyleProperty(style, "white-space")) {
    const value = getStyleValue(style, "white-space")!;
    if (value === "pre-wrap") {
      const textContent = getTextContent(node);
      return { element: "raw", data: textContent };
    }
  }

  // display:none / visibility:hidden → [[span style="..."]]
  // These appear when a user explicitly sets the style, so always treat as span.
  if (style.includes("display: none") || style.includes("display:none")) {
    const attrs = extractAttributes(node, []);
    const elements = rec(node);
    return container("span", elements, attrs);
  }
  if (style.includes("visibility: hidden") || style.includes("visibility:hidden")) {
    const attrs = extractAttributes(node, []);
    const elements = rec(node);
    return container("span", elements, attrs);
  }

  // color-only case is handled by recognizeSpanDispatch before reaching here.
  // Multi-property spans fall through to a generic span.

  const attrs = extractAttributes(node, []);
  const elements = rec(node);
  return container("span", elements, attrs);
}

/** Recognize a `<blockquote>` element. */
export function recognizeBlockquote(node: DomElement, rec: ChildrenRecognizer): Element {
  const attrs = extractAttributes(node, []);
  const elements = rec(node);
  return container("blockquote", elements, attrs);
}

/**
 * Recognize a generic `<div>` element.
 *
 * If the div has a `text-align` style, it is treated as an alignment container.
 * Otherwise it becomes a plain div container.
 */
export function recognizeDiv(node: DomElement, rec: ChildrenRecognizer): Element | null {
  const style = node.attribs.style ?? "";

  const alignMatch = style.match(/text-align:\s*(left|right|center|justify)/);
  if (alignMatch) {
    const align = alignMatch[1] as "left" | "right" | "center" | "justify";
    const attrs = extractAttributes(node, ["style"]);
    const elements = rec(node);
    return container({ align }, elements, attrs);
  }

  const attrs = extractAttributes(node, []);
  const elements = rec(node);
  return container("div", elements, attrs);
}

/**
 * Extract HTML attributes from a DOM element, filtering out excluded keys
 * and auto-generated TOC id attributes.
 *
 * @param node - The DOM element
 * @param exclude - Attribute names to exclude
 * @returns Filtered attribute map
 */
export function extractAttributes(node: DomElement, exclude: string[]): AttributeMap {
  const attrs: AttributeMap = {};
  const excludeSet = new Set(exclude);
  for (const [key, value] of Object.entries(node.attribs)) {
    if (excludeSet.has(key)) continue;
    if (key === "id" && /^toc\d+/.test(value)) continue;
    attrs[key] = value;
  }
  return Object.keys(attrs).length > 0 ? attrs : {};
}
