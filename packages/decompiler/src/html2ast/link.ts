import type { Element, AnchorTarget, LinkType, LinkLabel, LinkLocation } from "@wdprlib/ast";
import { link } from "@wdprlib/ast";
import type { Element as DomElement } from "domhandler";
import type { DecompileContext } from "./context";
import type { ChildrenRecognizer } from "./types-internal";

/**
 * Recognize an `<a>` element and convert it to the appropriate AST element.
 *
 * Handles anchor-name (`<a name="...">`), email links (`mailto:`), anchor
 * links (`javascript:;`), page links (relative `/path`), and direct
 * (external) links.
 */
export function recognizeLink(
  node: DomElement,
  _ctx: DecompileContext,
  rec: ChildrenRecognizer,
): Element[] {
  const href = node.attribs.href ?? "";
  const nameAttr = node.attribs.name;

  // anchor-name: <a name="..."></a>
  if (nameAttr && !href) {
    return [{ element: "anchor-name", data: nameAttr }];
  }

  // email link
  if (href.startsWith("mailto:")) {
    const email = href.slice(7);
    return [{ element: "email", data: email }];
  }

  const target = parseTarget(node.attribs.target);
  const labelElements = rec(node);
  const labelText = extractTextContent(labelElements);

  // anchor link: javascript:;
  if (href === "javascript:;") {
    const label: LinkLabel = labelText ? { text: labelText } : { text: "" };
    return [link(href, label, { type: "anchor", target })];
  }

  // page link: relative URL starting with /
  if (href.startsWith("/") && !href.startsWith("//")) {
    const pageName = href.slice(1).replace(/#.*$/, "");
    const extra = href.includes("#") ? href.slice(href.indexOf("#")) : null;
    const location: LinkLocation = { site: null, page: pageName };
    const label: LinkLabel = labelText && labelText !== pageName ? { text: labelText } : "page";
    return [link(location, label, { type: "page", extra, target })];
  }

  // direct link: external URL
  const linkType: LinkType = "direct";
  const label: LinkLabel = labelText && labelText !== href ? { text: labelText } : { url: href };
  return [link(href, label, { type: linkType, target })];
}

/** Map an HTML `target` attribute value to an {@link AnchorTarget}. */
function parseTarget(target: string | undefined): AnchorTarget | null {
  switch (target) {
    case "_blank":
      return "new-tab";
    case "_parent":
      return "parent";
    case "_top":
      return "top";
    case "_self":
      return "same";
    default:
      return null;
  }
}

/** Extract concatenated plain text from a flat array of AST elements. */
function extractTextContent(elements: Element[]): string {
  let result = "";
  for (const el of elements) {
    if (el.element === "text") {
      result += el.data;
    }
  }
  return result;
}
