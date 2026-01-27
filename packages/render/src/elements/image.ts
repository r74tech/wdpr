import type { ImageSource, ImageData } from "@wdpr/ast";
import type { RenderContext } from "../context";
import { escapeAttr, isDangerousUrl, sanitizeAttributes } from "../escape";

/** Render an image element */
export function renderImage(ctx: RenderContext, data: ImageData): void {
  let src = ctx.resolveImageSource(data.source);
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
    let href = typeof data.link === "string" ? data.link : `/${data.link.page}`;
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

function getAlignmentClass(align: string, isFloat: boolean): string {
  if (isFloat) {
    return align === "left" ? "floatleft" : "floatright";
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
