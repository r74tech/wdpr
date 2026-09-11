import { recognizeDate } from "./date";
import type { Element } from "@wdprlib/ast";
import { isTag, isText, type ChildNode, type Element as DomElement } from "domhandler";
import type { DecompileContext } from "./context";
import type { ChildrenRecognizer } from "./types-internal";
import { recognizeText, recognizeLineBreak, recognizeHorizontalRule } from "./text";
import {
  recognizeParagraph,
  recognizeInlineFormat,
  recognizeSpanContainer,
  recognizeBlockquote,
  recognizeDiv,
} from "./container";
import { recognizeHeading } from "./heading";
import { recognizeLink } from "./link";
import { recognizeImage, recognizeImageContainer } from "./image";
import { recognizeList, recognizeDefinitionList } from "./list";
import { recognizeTable } from "./table";
import { recognizeCodeBlock } from "./code";
import { recognizeCollapsible } from "./collapsible";
import { recognizeTabView } from "./tab-view";
import { recognizeFootnoteRef, recognizeFootnotesFooter } from "./footnote";
import { recognizeMathBlock, recognizeMathInline } from "./math";
import {
  recognizeColor,
  recognizeClearFloat,
  recognizeEmbed,
  recognizeIframe,
  recognizeStyle,
} from "./misc";
import { hasOnlyStyleProperty } from "./utils";

/**
 * Convert a single DOM node (text or element) into zero or more AST elements.
 *
 * Whitespace-only text nodes are normalised: nodes containing a space or NBSP
 * become a single space (inline separator), while nodes containing only
 * newlines/tabs are dropped (structural whitespace between blocks).
 */
export function recognizeNode(node: ChildNode, ctx: DecompileContext): Element[] {
  if (isText(node)) {
    const data = node.data;
    if (/^\s*$/.test(data)) {
      // Contains a space or NBSP → keep as inline separator
      // Only newlines/tabs → drop as structural whitespace between blocks
      if (/[ \u00a0]/.test(data)) {
        return [recognizeText(" ")];
      }
      return [];
    }
    return [recognizeText(data)];
  }

  if (!isTag(node)) return [];

  return recognizeElement(node, ctx);
}

/**
 * Dispatch a DOM element to the appropriate recognizer based on its tag name.
 *
 * @param node - The DOM element to recognise
 * @param ctx - Decompilation context
 * @returns Recognised AST elements
 */
export function recognizeElement(node: DomElement, ctx: DecompileContext): Element[] {
  const rec: ChildrenRecognizer = (n) => recognizeChildren(n, ctx);
  const className = node.attribs.class ?? "";

  switch (node.name) {
    case "p": {
      const iframe = findDirectChild(node, "iframe");
      if (iframe) return [recognizeIframe(iframe)];
      return [recognizeParagraph(node, rec)];
    }
    case "br":
      return [recognizeLineBreak()];
    case "hr":
      return [recognizeHorizontalRule()];

    // headings
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return [recognizeHeading(node, ctx, rec)];

    // inline formatting
    case "strong":
    case "b":
      return [recognizeInlineFormat(node, "bold", rec)];
    case "em":
    case "i":
      return [recognizeInlineFormat(node, "italics", rec)];
    case "sup":
      if (className.includes("footnoteref")) {
        return [recognizeFootnoteRef(node, ctx)];
      }
      return [recognizeInlineFormat(node, "superscript", rec)];
    case "sub":
      return [recognizeInlineFormat(node, "subscript", rec)];
    case "tt":
      return [recognizeInlineFormat(node, "monospace", rec)];
    case "mark":
      return [recognizeInlineFormat(node, "mark", rec)];
    case "ins":
      return [recognizeInlineFormat(node, "insertion", rec)];
    case "del":
      return [recognizeInlineFormat(node, "deletion", rec)];
    case "ruby":
      return [recognizeInlineFormat(node, "ruby", rec)];
    case "rt":
      return [recognizeInlineFormat(node, "ruby-text", rec)];

    // span
    case "span":
      return recognizeSpanDispatch(node, ctx, rec);

    // links
    case "a":
      return recognizeLink(node, ctx, rec);

    // images
    case "img":
      return [recognizeImage(node)];

    // block elements
    case "blockquote":
      return [recognizeBlockquote(node, rec)];

    case "div":
      return recognizeDivDispatch(node, ctx, rec);

    // lists
    case "ul":
    case "ol":
      return [recognizeList(node, ctx, rec)];
    case "dl":
      return [recognizeDefinitionList(node, ctx, rec)];

    // table
    case "table":
      return [recognizeTable(node, ctx, rec)];

    // iframe
    case "iframe":
      return [recognizeIframe(node)];

    // style
    case "style":
      return [recognizeStyle(node)];

    default:
      return recognizeChildren(node, ctx);
  }
}

/**
 * Dispatch a `<span>` element to the correct recognizer.
 *
 * Checks for math-inline, color-only style, and generic span containers
 * in priority order.
 */
function recognizeSpanDispatch(
  node: DomElement,
  ctx: DecompileContext,
  rec: ChildrenRecognizer,
): Element[] {
  const className = node.attribs.class ?? "";
  const style = node.attribs.style ?? "";

  const date = recognizeDate(node);
  if (date) return [date];

  // math-inline
  if (className.includes("math-inline")) {
    return [recognizeMathInline(node)];
  }

  // color property only → ##color|text##
  if (hasOnlyStyleProperty(style, "color")) {
    return [recognizeColor(node, ctx, rec)];
  }

  const result = recognizeSpanContainer(node, rec);
  if (result) return [result];
  return rec(node);
}

/**
 * Dispatch a `<div>` element to the correct recognizer.
 *
 * Checks for code blocks, collapsibles, tabviews, image containers,
 * footnotes-footer, math blocks, embeds, clear-floats, and generic divs
 * in priority order.
 */
function recognizeDivDispatch(
  node: DomElement,
  ctx: DecompileContext,
  rec: ChildrenRecognizer,
): Element[] {
  const className = node.attribs.class ?? "";
  const style = node.attribs.style ?? "";

  // code block
  if (className === "code" || className.startsWith("code ")) {
    return [recognizeCodeBlock(node)];
  }

  // collapsible
  if (className.includes("collapsible-block") && !className.includes("collapsible-block-")) {
    return [recognizeCollapsible(node, ctx, rec)];
  }

  // tabview
  if (className.includes("yui-navset")) {
    return [recognizeTabView(node, ctx, rec)];
  }

  // image container
  if (className.includes("image-container")) {
    const img = recognizeImageContainer(node);
    if (img) return [img];
  }

  // footnotes-footer
  if (className.includes("footnotes-footer")) {
    return recognizeFootnotesFooter(node, ctx, rec);
  }

  // math-block
  if (className.includes("math-block")) {
    return [recognizeMathBlock(node)];
  }

  // embed
  if (className.includes("embed-")) {
    const embed = recognizeEmbed(node);
    if (embed) return [embed];
  }

  // clear-float
  if (style.includes("clear:") || style.includes("clear :")) {
    const cf = recognizeClearFloat(node);
    if (cf) return [cf];
  }

  const result = recognizeDiv(node, rec);
  if (result) return [result];
  return recognizeChildren(node, ctx);
}

/** Find a direct child element by tag name. */
function findDirectChild(node: DomElement, tagName: string): DomElement | null {
  for (const child of node.childNodes) {
    if (isTag(child) && child.name === tagName) return child;
  }
  return null;
}

/**
 * Recursively recognise all child nodes of a DOM element.
 *
 * @param node - Parent DOM element
 * @param ctx - Decompilation context
 * @returns Flat array of recognised AST elements
 */
export function recognizeChildren(node: DomElement, ctx: DecompileContext): Element[] {
  const elements: Element[] = [];
  for (const child of node.childNodes) {
    elements.push(...recognizeNode(child, ctx));
  }
  return elements;
}
