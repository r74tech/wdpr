/**
 *
 * Renderer for Wikidot image elements (`[[image source]]` and `[[f<image source]]`).
 *
 * Images can be sourced from URLs, page-attached files, or cross-site
 * files. The renderer resolves the source to a URL, sanitizes all
 * attributes, optionally wraps the image in a link (`link` attribute),
 * and optionally wraps everything in an alignment container div.
 *
 * @module
 */

import type { ImageSource, ImageData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, isDangerousUrl, sanitizeAttributes } from "../escape";

/**
 * Render an image element with optional link wrapper and alignment container.
 *
 * Processing steps:
 * 1. Resolve the image source to a URL via `ctx.resolveImageSource()`.
 * 2. Sanitize user-supplied attributes.
 * 3. Build the `<img>` tag with safe attributes.
 * 4. Optionally wrap in an `<a>` tag if a link target is specified.
 * 5. Optionally wrap in a `<div class="image-container ...">` for alignment.
 *
 * Dangerous URLs are replaced with `#invalid-url`. Local paths blocked
 * by settings cause the entire image to be silently dropped.
 *
 * @param ctx - The current render context.
 * @param data - Image element data with source, attributes, optional link, and alignment.
 */
export function renderImage(ctx: RenderContext, data: ImageData): void {
  let src = ctx.resolveImageSource(data.source);
  if (src === null) return; // Local path blocked by settings
  if (isDangerousUrl(src)) {
    src = "#invalid-url";
  }
  const safeAttrs = sanitizeAttributes(data.attributes);
  const alt = safeAttrs.alt ?? getFilenameFromSource(data.source);
  const className = safeAttrs.class ?? "image";

  // Build img attributes
  const imgAttrs: string[] = [`src="${escapeAttr(src)}"`];

  // Custom attributes (title, style, etc.) before alt/class
  // Skip src/srcset to prevent override of resolved source
  for (const [key, value] of Object.entries(safeAttrs)) {
    if (key === "alt" || key === "class" || key === "src" || key === "srcset") continue;
    imgAttrs.push(`${key}="${escapeAttr(value)}"`);
  }

  imgAttrs.push(`alt="${escapeAttr(alt)}"`);

  // Only override class if not custom
  if (!safeAttrs.class) {
    imgAttrs.push(`class="${escapeAttr(className)}"`);
  } else {
    imgAttrs.push(`class="${escapeAttr(safeAttrs.class)}"`);
  }

  const imgTag = `<img ${imgAttrs.join(" ")} />`;

  // Wrap in link if needed
  let output = imgTag;
  if (data.link) {
    let href: string;
    if (typeof data.link === "string") {
      // Add leading slash for page links (not URLs or anchors)
      if (
        !data.link.startsWith("/") &&
        !data.link.startsWith("#") &&
        !data.link.startsWith("http://") &&
        !data.link.startsWith("https://")
      ) {
        href = `/${data.link}`;
      } else {
        href = data.link;
      }
    } else {
      href = `/${data.link.page}`;
    }
    if (isDangerousUrl(href)) {
      href = "#invalid-url";
    }
    output = `<a href="${escapeAttr(href)}">${imgTag}</a>`;
  }

  // Wrap in alignment container if needed
  if (data.alignment) {
    const alignClass = getAlignmentClass(data.alignment.align, data.alignment.float);
    ctx.push(`<div class="image-container ${alignClass}">`);
    ctx.push(output);
    ctx.push("</div>");
  } else {
    ctx.push(output);
  }
}

/**
 * Map an alignment direction and float flag to a Wikidot CSS class name.
 *
 * @param align - Alignment direction (`"left"`, `"right"`, `"center"`).
 * @param isFloat - Whether the image uses float positioning.
 * @returns CSS class name (e.g. `"floatleft"`, `"aligncenter"`).
 */
function getAlignmentClass(align: string, isFloat: boolean): string {
  if (isFloat) {
    switch (align) {
      case "left":
        return "floatleft";
      case "right":
        return "floatright";
      case "center":
        return "floatcenter";
      default:
        return `float${align}`;
    }
  }
  switch (align) {
    case "left":
      return "alignleft";
    case "right":
      return "alignright";
    case "center":
      return "aligncenter";
    default:
      return `align${align}`;
  }
}

/**
 * Extract a filename from an image source for use as the default `alt` text.
 *
 * For URL sources, the last path segment is returned. For file-type sources,
 * the file name field is returned directly.
 *
 * @param source - The image source descriptor.
 * @returns The extracted filename string.
 */
function getFilenameFromSource(source: ImageSource): string {
  switch (source.type) {
    case "url": {
      const parts = source.data.split("/");
      return parts[parts.length - 1] ?? source.data;
    }
    case "file1":
      return source.data.file;
    case "file2":
      return source.data.file;
    case "file3":
      return source.data.file;
  }
}
