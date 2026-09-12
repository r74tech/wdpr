import type { Element, SocialData } from "@wdprlib/ast";
import { isTag, type Element as DomElement } from "domhandler";

const rootAttributes = new Set([
  "class",
  "data-wdpr-social",
  "data-wdpr-social-url",
  "data-wdpr-social-title",
]);
const linkAttributes = new Set([
  "data-wdpr-social-site",
  "data-wdpr-social-template",
  "href",
  "aria-disabled",
  "target",
  "rel",
  "title",
  "aria-label",
]);
const svgAttributes = new Set(["xmlns", "viewbox", "width", "height", "fill", "aria-hidden"]);

/** Only the dedicated generated shape carries the original service selection. */
export function recognizeSocial(node: DomElement): Element | null {
  if (
    node.attribs.class !== "wdpr-social" ||
    Object.keys(node.attribs).some((key) => !rootAttributes.has(key))
  )
    return null;
  let sites: SocialData["sites"];
  try {
    const value: unknown = JSON.parse(node.attribs["data-wdpr-social"] ?? "");
    if (value !== null && (!Array.isArray(value) || value.some((site) => typeof site !== "string")))
      return null;
    sites = value as SocialData["sites"];
  } catch {
    return null;
  }
  for (const child of node.children) {
    if (child.type === "text" && !child.data.trim()) continue;
    if (
      !isTag(child) ||
      child.name !== "a" ||
      !child.attribs["data-wdpr-social-site"] ||
      !child.attribs["data-wdpr-social-template"] ||
      Object.keys(child.attribs).some((key) => !linkAttributes.has(key))
    )
      return null;
    if (
      child.attribs.target !== "_blank" ||
      child.attribs.rel !== "noopener noreferrer" ||
      !child.attribs.title ||
      child.attribs.title !== child.attribs["aria-label"] ||
      child.children.length !== 1
    )
      return null;
    const svg = child.children[0]!;
    if (
      !isTag(svg) ||
      svg.name !== "svg" ||
      svg.attribs["aria-hidden"] !== "true" ||
      Object.keys(svg.attribs).some((key) => !svgAttributes.has(key)) ||
      svg.children.length !== 1
    )
      return null;
    const path = svg.children[0]!;
    if (
      !isTag(path) ||
      path.name !== "path" ||
      !path.attribs.d ||
      Object.keys(path.attribs).length !== 1 ||
      path.children.length
    )
      return null;
  }
  return { element: "social", data: { sites } };
}
