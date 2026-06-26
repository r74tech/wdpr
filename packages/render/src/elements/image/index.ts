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

import type { ImageData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { isDangerousUrl } from "../../escape";
import { buildImageTag } from "./attributes";
import { pushAlignedImage } from "./alignment";
import { wrapImageLink } from "./link";

/**
 * Render an image element with optional link wrapper and alignment container.
 *
 * Dangerous URLs are replaced with `#invalid-url`. Local paths blocked
 * by settings cause the entire image to be silently dropped.
 */
export function renderImage(ctx: RenderContext, data: ImageData): void {
  let src = ctx.resolveImageSource(data.source);
  if (src === null) return;
  if (isDangerousUrl(src)) {
    src = "#invalid-url";
  }

  const imageTag = buildImageTag(src, data.source, data.attributes);
  const output = wrapImageLink(imageTag, data.link);
  pushAlignedImage(ctx, output, data.alignment);
}
