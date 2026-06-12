/**
 *
 * Post-processing pass: unwrap paragraphs whose body contains an `image`
 * element.
 *
 * Wikidot's `Paragraph.php` skips lines that contain an `<img>` token
 * (and, by extension, `<a>...<img>...</a>` runs) via its `$skip` list,
 * so the resulting block is placed directly inside its enclosing
 * container rather than wrapped in a `<p>`. The rule applies uniformly
 * at every nesting depth — including the top level — so this pass walks
 * the entire tree and unwraps every paragraph container whose elements
 * (transitively) hold an image.
 *
 * Examples:
 *
 * - `[[div]]\n[[image x]]\n[[/div]]`
 *   AST before: div > paragraph > image
 *   AST after:  div > image
 *
 * - `[[div]]\n[[image x]]\ntext\n[[/div]]`
 *   AST before: div > paragraph > [image, line-break, text]
 *   AST after:  div > [image, line-break, text]
 *
 * - `BASIC [[image x]]` at the top level
 *   AST before: paragraph > [text("BASIC "), image]
 *   AST after:  [text("BASIC "), image]
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

/**
 * Walk an element tree and return whether it (transitively) contains a
 * plain (non-aligned) `image` element.
 *
 * Wikidot's `Paragraph.php` `$skip` list contains both `<img` and `<div`
 * tokens, but the two are handled differently: a bare `<img>` (Wikidot's
 * `[[image ...]]`) is inline and only needs the surrounding `<p>` to be
 * removed, while an aligned variant (`[[<image]]`, `[[>image]]`,
 * `[[=image]]`, `[[f<image]]`, `[[f>image]]`, `[[f=image]]`) is rendered
 * as a block-level `<div class="image-container">…</div>` that requires
 * splitting the surrounding text into its own paragraph. We only treat
 * the plain form here; aligned images are left inside their paragraph
 * for a future pass to break out.
 *
 * `<a>...<img>...</a>` runs also qualify because Wikidot treats a link
 * wrapping an image as image-like for paragraph-skip purposes.
 */
function containsImage(elements: readonly Element[]): boolean {
  for (const el of elements) {
    if (el.element === "image") {
      const data = el.data as { alignment?: unknown };
      // Only plain (alignment === null) images trigger paragraph unwrap.
      if (data.alignment == null) return true;
      continue;
    }
    const data = (el as { data?: unknown }).data;
    if (data && typeof data === "object" && "elements" in data) {
      const children = (data as { elements?: unknown }).elements;
      if (Array.isArray(children) && containsImage(children as Element[])) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Recursively unwrap paragraph containers that hold an `image` element.
 * Applies at every nesting depth, including the top level. `mapElementChildren`
 * handles the AST shapes whose children live outside of `data.elements`
 * (list items, table cells, definition-list keys/values, tab-view panels)
 * so the pass behaves consistently for image paragraphs nested inside
 * such containers.
 */
export function unwrapImageParagraphs(elements: readonly Element[]): Element[] {
  const out: Element[] = [];
  for (const el of elements) {
    const processed = mapElementChildren(el, (children) => unwrapImageParagraphs(children));
    if (isParagraphContainer(processed) && containsImage(processed.data.elements)) {
      out.push(...processed.data.elements);
    } else {
      out.push(processed);
    }
  }
  return out;
}
