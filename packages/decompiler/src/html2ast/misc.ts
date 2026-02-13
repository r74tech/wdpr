import type { Element, ClearFloat, ColorData, IframeData, Embed } from "@wdprlib/ast";
import type { Element as DomElement } from "domhandler";
import { isTag } from "domhandler";
import type { DecompileContext } from "./context";
import type { ChildrenRecognizer } from "./types-internal";

/**
 * Recognize a `<span style="color: ...;">` element as a color AST element.
 *
 * The color value is extracted from the inline style.
 */
export function recognizeColor(
  node: DomElement,
  _ctx: DecompileContext,
  rec: ChildrenRecognizer,
): Element {
  const style = node.attribs.style ?? "";
  const match = style.match(/color:\s*([^;]+)/);
  const color = match ? match[1]!.trim() : "inherit";
  const elements = rec(node);

  const data: ColorData = { color, elements };
  return { element: "color", data };
}

/**
 * Recognize a clear-float div (`<div style="clear:both; ...">`)
 * as a clear-float AST element.
 *
 * @returns The clear-float element, or `null` if the style does not contain `clear:`
 */
export function recognizeClearFloat(node: DomElement): Element | null {
  const style = node.attribs.style ?? "";
  if (!style.includes("clear:") && !style.includes("clear :")) return null;

  let direction: ClearFloat = "both";
  if (style.includes("clear:left") || style.includes("clear: left")) {
    direction = "left";
  } else if (style.includes("clear:right") || style.includes("clear: right")) {
    direction = "right";
  }

  return { element: "clear-float", data: direction };
}

/**
 * Recognize an embed container (`<div class="embed-youtube">`, etc.)
 * as an embed AST element.
 *
 * @returns The embed element, or `null` if the class is not a known embed type
 */
export function recognizeEmbed(node: DomElement): Element | null {
  const className = node.attribs.class ?? "";

  if (className.includes("embed-youtube")) {
    const iframe = findDescendantTag(node, "iframe");
    if (!iframe) return null;
    const src = iframe.attribs.src ?? "";
    const match = src.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
    if (!match) return null;
    const data: Embed = { embed: "youtube", data: { "video-id": match[1]! } };
    return { element: "embed", data };
  }

  if (className.includes("embed-vimeo")) {
    const iframe = findDescendantTag(node, "iframe");
    if (!iframe) return null;
    const src = iframe.attribs.src ?? "";
    const match = src.match(/vimeo\.com\/video\/([a-zA-Z0-9_-]+)/);
    if (!match) return null;
    const data: Embed = { embed: "vimeo", data: { "video-id": match[1]! } };
    return { element: "embed", data };
  }

  return null;
}

/**
 * Recognize an `<iframe>` element as an iframe AST element.
 *
 * Only a subset of safe attributes (width, height, scrolling, frameborder,
 * class, style) are preserved.
 */
export function recognizeIframe(node: DomElement): Element {
  const url = node.attribs.src ?? "";
  const attrs: Record<string, string> = {};
  const allowedAttrs = ["width", "height", "scrolling", "frameborder", "class", "style"];
  for (const attr of allowedAttrs) {
    if (node.attribs[attr]) {
      attrs[attr] = node.attribs[attr]!;
    }
  }

  const data: IframeData = { url, attributes: attrs };
  return { element: "iframe", data };
}

/** Recognize a `<style>` element as a style AST element. */
export function recognizeStyle(node: DomElement): Element {
  const content = getTextContent(node);
  return { element: "style", data: content };
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
