import { isPageButtonAction, type Element } from "@wdprlib/ast";
import type { Element as DomElement } from "domhandler";
import { textContent } from "domutils";

export function recognizeButton(node: DomElement): Element | null {
  const action = node.attribs["data-wdpr-page-action"];
  if (!action || !isPageButtonAction(action) || node.attribs.href !== "#") return null;
  const allowed = new Set(["class", "style", "href", "data-wdpr-page-action"]);
  if (
    Object.keys(node.attribs).some((key) => !allowed.has(key)) ||
    node.children.some((child) => child.type !== "text")
  )
    return null;
  const attributes: Record<string, string> = {};
  if (node.attribs.class && node.attribs.class !== "wiki-standalone-button")
    attributes.class = node.attribs.class;
  if (node.attribs.style) attributes.style = node.attribs.style;
  return { element: "button", data: { action, text: textContent(node), attributes } };
}
