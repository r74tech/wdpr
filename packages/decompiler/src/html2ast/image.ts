import type {
  Element,
  ImageSource,
  FloatAlignment,
  Alignment,
  AttributeMap,
  LinkLocation,
} from "@wdprlib/ast";
import type { Element as DomElement } from "domhandler";
import { isTag } from "domhandler";

/**
 * Recognize a standalone `<img>` element and convert it to an image AST element.
 *
 * Alignment and link information are inferred from the parent DOM structure.
 */
export function recognizeImage(node: DomElement): Element {
  const src = node.attribs.src ?? "";
  const source = parseImageSource(src);
  const attrs = extractImageAttributes(node);
  const linkLocation = findImageLink(node);
  const alignment = findImageAlignment(node);

  return {
    element: "image",
    data: {
      source,
      link: linkLocation,
      alignment,
      attributes: attrs,
    },
  };
}

/**
 * Recognize a `<div class="image-container">` wrapper and extract its inner
 * image as an AST element with alignment metadata.
 *
 * @returns The image element, or `null` if no `<img>` is found inside
 */
export function recognizeImageContainer(node: DomElement): Element | null {
  const className = node.attribs.class ?? "";
  if (!className.includes("image-container")) return null;

  // Find the <img> inside the image-container
  const img = findDescendant(node, "img");
  if (!img) return null;

  const src = img.attribs.src ?? "";
  const source = parseImageSource(src);
  const attrs = extractImageAttributes(img);
  const linkLocation = findImageLink(img);
  const alignment = parseAlignmentFromClass(className);

  return {
    element: "image",
    data: {
      source,
      link: linkLocation,
      alignment,
      attributes: attrs,
    },
  };
}

/** Parse an image `src` URL into an {@link ImageSource}. */
function parseImageSource(src: string): ImageSource {
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) {
    return { type: "url", data: src };
  }
  return { type: "url", data: src };
}

/** Extract relevant HTML attributes from an `<img>` element. */
function extractImageAttributes(node: DomElement): AttributeMap {
  const attrs: AttributeMap = {};
  if (node.attribs.alt) attrs.alt = node.attribs.alt;
  if (node.attribs.width) attrs.width = node.attribs.width;
  if (node.attribs.height) attrs.height = node.attribs.height;
  if (node.attribs.class && node.attribs.class !== "image") {
    attrs.class = node.attribs.class;
  }
  if (node.attribs.style) attrs.style = node.attribs.style;
  return attrs;
}

/** Find the link URL from a parent `<a>` tag wrapping the image. */
function findImageLink(imgNode: DomElement): LinkLocation | null {
  const parent = imgNode.parent;
  if (parent && isTag(parent) && parent.name === "a") {
    const href = parent.attribs.href;
    if (href) return href;
  }
  return null;
}

/**
 * Determine image alignment from the parent DOM structure.
 *
 * Walks up through an optional `<a>` wrapper to find the image-container div.
 */
function findImageAlignment(imgNode: DomElement): FloatAlignment | null {
  const parent = imgNode.parent;
  if (parent && isTag(parent)) {
    // If the parent is an <a> tag, check its parent instead
    const containerNode = parent.name === "a" ? parent.parent : parent;
    if (containerNode && isTag(containerNode)) {
      const className = containerNode.attribs.class ?? "";
      if (className.includes("image-container")) {
        return parseAlignmentFromClass(className);
      }
    }
  }
  return null;
}

/**
 * Parse float/alignment from a class name like `"image-container floatleft"`.
 *
 * @returns The alignment, or `null` if no alignment class is found
 */
function parseAlignmentFromClass(className: string): FloatAlignment | null {
  const floatMatch = className.match(/float(left|right|center)/);
  if (floatMatch) {
    return { align: floatMatch[1] as Alignment, float: true };
  }
  const alignMatch = className.match(/align(left|right|center)/);
  if (alignMatch) {
    return { align: alignMatch[1] as Alignment, float: false };
  }
  return null;
}

/** Recursively find a descendant element by tag name. */
function findDescendant(node: DomElement, tagName: string): DomElement | null {
  for (const child of node.childNodes) {
    if (isTag(child)) {
      if (child.name === tagName) return child;
      const found = findDescendant(child, tagName);
      if (found) return found;
    }
  }
  return null;
}
