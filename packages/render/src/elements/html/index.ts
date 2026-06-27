/**
 *
 * Renderer for `[[html]]...[[/html]]` blocks in Wikidot markup.
 *
 * @module
 */

import type { HtmlData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { escapeAttr } from "../../escape";
import { getHtmlBlockAttributes } from "./attributes";
import { resolveHtmlBlockUrl } from "./url";

/**
 * Render a `[[html]]` block as an iframe wrapped in a `<p>` element.
 *
 * The iframe uses `class="html-block-iframe"` so the runtime can
 * identify it for auto-resize. An optional `sandbox` attribute and
 * custom `style` attribute (from `[[html style="..."]]`) are applied.
 *
 * @param ctx - The current render context.
 * @param data - HTML block data containing the raw HTML contents and optional style.
 */
export function renderHtmlBlock(ctx: RenderContext, data: HtmlData): void {
  // Settings-level enforcement boundary: skip rendering entirely when
  // `[[html]]` is disabled. Placed before any counter advance or
  // resolver invocation so disabled AST blocks have no observable effect.
  if (ctx.settings.allowHtmlBlocks === false) {
    return;
  }

  const index = ctx.nextHtmlBlockIndex();
  const src = resolveHtmlBlockUrl(ctx, data.contents, index);
  const attrs = getHtmlBlockAttributes(ctx, data);

  ctx.push(
    `<p><iframe src="${escapeAttr(src)}"${attrs.sandbox} allowtransparency="true" frameborder="0" class="html-block-iframe"${attrs.style}></iframe></p>`,
  );
}
