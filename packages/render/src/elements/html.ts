/**
 *
 * Renderer for `[[html]]...[[/html]]` blocks in Wikidot markup.
 *
 * HTML blocks are rendered as sandboxed iframes. The iframe `src` URL
 * can be provided by a resolver callback; when absent, a deterministic
 * default URL is generated from the content hash.
 *
 * The actual HTML content is not inlined into the page -- it is served
 * separately at the iframe URL. The runtime `html-block` module handles
 * auto-resizing of the iframe via `postMessage`.
 *
 * @module
 */

import type { HtmlData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, sanitizeStyleValue } from "../escape";
import { syncHashSha1 } from "../hash";

/**
 * Generate a default iframe `src` URL for an HTML block when no
 * resolver callback is provided.
 *
 * The URL follows Wikidot's pattern: `/{pageName}/html/{hash}-{nonce}`.
 * The hash is a SHA-1-length FNV hash of the content, and the nonce
 * is derived from the content length and first hash character to
 * provide additional uniqueness.
 *
 * @param pageName - The current page name (may be empty).
 * @param contents - Raw HTML content to hash.
 * @returns A URL path string, always starting with `/`.
 */
function generateDefaultUrl(pageName: string, contents: string): string {
  const hash = syncHashSha1(contents);
  const nonce = BigInt(contents.length) * 1000000000n + BigInt(hash.charCodeAt(0)) * 100000000n;
  // Ensure leading slash even when pageName is empty (avoid protocol-relative URL)
  const path = pageName ? `/${pageName}/html/${hash}-${nonce}` : `/html/${hash}-${nonce}`;
  return path;
}

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
  const index = ctx.nextHtmlBlockIndex();
  const pageName = ctx.page?.pageName ?? "";

  // Use callback URL if provided, otherwise generate default URL
  const callbackUrl = ctx.options.resolvers?.htmlBlockUrl?.(index);
  const src = callbackUrl || generateDefaultUrl(pageName, data.contents);

  // Build sandbox attribute (null/undefined = no sandbox, Wikidot compatible)
  const sandbox = ctx.options.htmlBlockSandbox;
  const sandboxAttr = sandbox ? ` sandbox="${escapeAttr(sandbox)}"` : "";

  // Build style attribute (from [[html style="..."]]) with CSS injection protection
  const styleAttr = data.style ? ` style="${escapeAttr(sanitizeStyleValue(data.style))}"` : "";

  // Wikidot wraps html block iframe in a paragraph
  ctx.push(
    `<p><iframe src="${escapeAttr(src)}"${sandboxAttr} allowtransparency="true" frameborder="0" class="html-block-iframe"${styleAttr}></iframe></p>`,
  );
}
