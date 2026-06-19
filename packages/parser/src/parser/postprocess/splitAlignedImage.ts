/**
 *
 * Post-processing pass: split paragraphs around aligned-image elements.
 *
 * Wikidot's aligned image forms (`[[<image]]`, `[[>image]]`, `[[=image]]`
 * and the float-prefixed variants) render as block-level
 * `<div class="image-container ...">…</div>` markup. `Paragraph.php`
 * lists `<div` in its `$skip` set, so when an inline paragraph happens to
 * contain such an aligned image, Wikidot breaks the paragraph: the text
 * before / after the image is kept as a separate `<p>` and the
 * `<div class="image-container">` is emitted as a sibling.
 *
 * Example:
 *
 * Source: `LEFT [[<image x]]`
 *
 * AST before this pass:
 *   container/paragraph { elements: [text("LEFT "), image{alignment:left}] }
 *
 * AST after this pass:
 *   container/paragraph { elements: [text("LEFT")] }
 *   image{alignment:left}
 *
 * Adjacent runs of aligned images (`[[<image]]\n[[>image]]`) are split
 * into siblings as well; no joining `<br />` is emitted between them
 * since each block-level element already produces its own line.
 *
 * Plain (non-aligned) images are left in place — they are removed from
 * their wrapper by the subsequent `unwrapImageParagraphs` pass instead.
 *
 * @module
 */

import type { Element, ContainerData } from "@wdprlib/ast";
import { mapElementChildren } from "../rules/block/module/walk";

function isParagraphContainer(
  el: Element | undefined,
): el is Element & { element: "container"; data: ContainerData & { type: "paragraph" } } {
  if (!el || el.element !== "container") return false;
  const data = el.data as ContainerData;
  return data.type === "paragraph";
}

function isAlignedImage(el: Element): boolean {
  if (el.element !== "image") return false;
  const data = el.data as { alignment?: unknown };
  return data.alignment != null;
}

/**
 * Trim leading / trailing whitespace-only text nodes and pop the final
 * line-break if the segment ends with one. This mirrors the inline
 * cleanup done by the paragraph rule and prevents stray `<br />` tags
 * from spilling out next to the extracted `<div>` siblings.
 */
function trimEdges(elements: Element[]): Element[] {
  const out = [...elements];
  while (out.length > 0) {
    const last = out[out.length - 1];
    if (!last) break;
    if (last.element === "line-break") {
      out.pop();
      continue;
    }
    if (
      last.element === "text" &&
      typeof (last as { data?: unknown }).data === "string" &&
      (last as { data: string }).data.trim() === ""
    ) {
      out.pop();
      continue;
    }
    break;
  }
  while (out.length > 0) {
    const first = out[0];
    if (!first) break;
    if (first.element === "line-break") {
      out.shift();
      continue;
    }
    if (
      first.element === "text" &&
      typeof (first as { data?: unknown }).data === "string" &&
      (first as { data: string }).data.trim() === ""
    ) {
      out.shift();
      continue;
    }
    break;
  }
  return out;
}

function makeParagraph(elements: Element[]): Element {
  return {
    element: "container",
    data: { type: "paragraph", attributes: {}, elements },
  } as Element;
}

/**
 * Split a single paragraph's element list around aligned images. Returns
 * a sequence of paragraph containers and standalone image elements that
 * collectively replace the original paragraph.
 */
function splitOneParagraph(elements: readonly Element[]): Element[] {
  const out: Element[] = [];
  let buffer: Element[] = [];

  const flush = (): void => {
    const trimmed = trimEdges(buffer);
    buffer = [];
    if (trimmed.length === 0) return;
    out.push(makeParagraph(trimmed));
  };

  for (const el of elements) {
    if (isAlignedImage(el)) {
      flush();
      out.push(el);
    } else {
      buffer.push(el);
    }
  }
  flush();

  return out;
}

/**
 * Walk an element tree and split every paragraph container that holds an
 * aligned image. `mapElementChildren` reaches the AST shapes whose
 * children live outside of `data.elements` (list items, table cells,
 * definition-list keys/values, tab-view panels), so the split behaves
 * consistently for aligned-image paragraphs nested inside any container.
 */
export function splitAlignedImageParagraphs(elements: readonly Element[]): Element[] {
  const out: Element[] = [];
  for (const el of elements) {
    const processed = mapElementChildren(el, (children) => splitAlignedImageParagraphs(children));
    if (isParagraphContainer(processed)) {
      const containsAligned = processed.data.elements.some(isAlignedImage);
      if (containsAligned) {
        out.push(...splitOneParagraph(processed.data.elements));
        continue;
      }
    }
    out.push(processed);
  }
  return out;
}
