import type { Element } from "@wdprlib/ast";
import { isTag, type Element as DomElement } from "domhandler";

/** Recognize only the renderer's reference shape, preserving the original label. */
export function recognizeEquationReference(node: DomElement): Element | null {
  const name = node.attribs["data-name"];
  if (node.attribs.class !== "eref" || name === undefined) return null;
  const target = node.attribs["data-target"];
  if (target === undefined) {
    if (
      Object.keys(node.attribs).length !== 2 ||
      node.children.some((child) => child.type !== "text") ||
      node.children.map((child) => (child.type === "text" ? child.data : "")).join("") !== name
    )
      return null;
  } else {
    if (Object.keys(node.attribs).length !== 3 || node.children.length !== 2) return null;
    const [link, tooltip] = node.children;
    if (
      !link ||
      !tooltip ||
      !isTag(link) ||
      !isTag(tooltip) ||
      link.name !== "a" ||
      link.attribs.class !== "eref-link" ||
      link.attribs.href !== `#${target}` ||
      Object.keys(link.attribs).length !== 2 ||
      link.children.length !== 1 ||
      link.children[0]?.type !== "text" ||
      !/^\d+$/.test(link.children[0].data) ||
      tooltip.name !== "span" ||
      tooltip.attribs.class !== "eref-tooltip" ||
      tooltip.attribs["aria-hidden"] !== "true" ||
      Object.keys(tooltip.attribs).length !== 2 ||
      tooltip.children.length !== 0
    )
      return null;
  }
  return { element: "equation-reference", data: name };
}
