import type { GalleryOrder } from "@wdprlib/ast";
import type { PageFileData } from "../../types";

/**
 * Sort page attachments by a gallery's `order` attribute.
 *
 * Returns a new array (the shared {@link PageFileData} list from the page
 * context is never mutated). Rules:
 * - `name` / `name desc`: code-point comparison of the filename; `desc`
 *   flips the comparison. Names are unique per page, so no tie-break.
 * - `created_at` / `created_at desc`: files with `createdAt` come first,
 *   compared numerically (`desc` flips only this comparison); equal
 *   timestamps tie-break on name ascending (also under `desc`). Files
 *   without `createdAt` always sort last, keeping their given order.
 */
export function sortGalleryFiles(
  files: readonly PageFileData[],
  order: GalleryOrder,
): PageFileData[] {
  const sorted = [...files];
  const desc = order.endsWith(" desc");

  if (order === "name" || order === "name desc") {
    sorted.sort((a, b) => (desc ? compareNames(b, a) : compareNames(a, b)));
    return sorted;
  }

  sorted.sort((a, b) => {
    if (a.createdAt !== undefined && b.createdAt !== undefined) {
      const diff = desc ? b.createdAt - a.createdAt : a.createdAt - b.createdAt;
      if (diff !== 0) return diff;
      return compareNames(a, b);
    }
    if (a.createdAt !== undefined) return -1;
    if (b.createdAt !== undefined) return 1;
    return 0;
  });
  return sorted;
}

function compareNames(a: PageFileData, b: PageFileData): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}
