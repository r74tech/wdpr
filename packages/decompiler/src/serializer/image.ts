import type { ImageData, ImageSource } from "@wdprlib/ast";
import type { SerializeContext } from "./context";
import { formatDirectiveAttributes, isSafeBareToken } from "./directive-safety";

/**
 * Serialize an image element to Wikidot `[[image ...]]` syntax.
 *
 * Includes alignment prefix (`<`, `>`, `=`, `f<`, `f>`, `f=`), link, and
 * additional attributes (alt, width, height, etc.).
 */
export function serializeImage(ctx: SerializeContext, data: ImageData): void {
  const source = formatImageSource(data.source);
  if (!isSafeBareToken(source)) return;
  const attributes: Record<string, string> = {};

  // Alignment → Wikidot prefix (<, >, =, f<, f>, f=)
  let alignPrefix = "";
  if (data.alignment) {
    const { align, float: isFloat } = data.alignment;
    if (isFloat) {
      switch (align) {
        case "left":
          alignPrefix = "f<";
          break;
        case "right":
          alignPrefix = "f>";
          break;
        case "center":
          alignPrefix = "f=";
          break;
      }
    } else {
      switch (align) {
        case "left":
          alignPrefix = "<";
          break;
        case "right":
          alignPrefix = ">";
          break;
        case "center":
          alignPrefix = "=";
          break;
      }
    }
  }

  if (data.link) {
    attributes.link = typeof data.link === "string" ? data.link : data.link.page;
  }

  for (const [key, value] of Object.entries(data.attributes)) {
    if (key === "class" && value === "image") continue;
    attributes[key] = value;
  }

  const attrStr = formatDirectiveAttributes(attributes);
  ctx.push(`[[${alignPrefix}image ${source}${attrStr}]]`);
}

/** Format an {@link ImageSource} as a Wikidot source string. */
function formatImageSource(source: ImageSource): string {
  switch (source.type) {
    case "url":
      return source.data;
    case "file1":
      return source.data.file;
    case "file2":
      return `${source.data.page}/${source.data.file}`;
    case "file3":
      return `${source.data.site}:${source.data.page}/${source.data.file}`;
  }
}
