import type { GalleryData, GalleryItem } from "@wdprlib/ast";
import type { SerializeContext } from "./context";

/**
 * Serialize a gallery element to `[[gallery]]` syntax.
 *
 * Attributes are emitted only when they differ from the Wikidot defaults
 * (`size="thumbnail"`, `order="name"`, viewer enabled). The auto form
 * serializes as the bare opening tag — resolved attachment lists are not
 * persisted, so a reparse yields `files: null` again. Item lines restore
 * the `*` new-window prefix on the source and backslash-escape `"` and
 * `\` in attribute values (the parser's unescaping counterpart).
 */
export function serializeGallery(ctx: SerializeContext, data: GalleryData): void {
  const attrs: string[] = [];
  if (data.size !== "thumbnail") attrs.push(`size="${data.size}"`);
  if (data.order !== "name") attrs.push(`order="${data.order}"`);
  if (!data.viewer) attrs.push('viewer="no"');
  const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";

  ctx.pushBlockLine(`[[gallery${attrStr}]]`);

  // items is non-empty by parser invariant; an empty array (defensive)
  // serializes like the auto form to avoid an unparsable empty body.
  if (data.content.type === "items" && data.content.items.length > 0) {
    for (const item of data.content.items) {
      ctx.pushBlockLine(serializeGalleryItem(item));
    }
    ctx.pushBlockLine("[[/gallery]]");
  }

  ctx.requestBlankLine();
}

function serializeGalleryItem(item: GalleryItem): string {
  const star = item.newWindow ? "*" : "";
  let line = `: ${star}${item.source}`;
  if (item.link !== null) line += ` link="${escapeAttrValue(item.link)}"`;
  if (item.alt !== null) line += ` alt="${escapeAttrValue(item.alt)}"`;
  return line;
}

/** Inverse of the parser's stripslashes: escape backslashes and quotes. */
function escapeAttrValue(value: string): string {
  return value.replace(/[\\"]/g, (c) => `\\${c}`);
}
