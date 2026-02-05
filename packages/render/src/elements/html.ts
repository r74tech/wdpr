import type { HtmlData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, sanitizeStyleValue } from "../escape";
import { syncHashSha1 } from "../hash";

/** Generate default URL for htmlBlock (fallback when callback is not provided) */
function generateDefaultUrl(pageName: string, contents: string): string {
  const hash = syncHashSha1(contents);
  const nonce = BigInt(contents.length) * 1000000000n + BigInt(hash.charCodeAt(0)) * 100000000n;
  // Ensure leading slash even when pageName is empty (avoid protocol-relative URL)
  const path = pageName ? `/${pageName}/html/${hash}-${nonce}` : `/html/${hash}-${nonce}`;
  return path;
}

/** Render HTML block as iframe wrapped in paragraph */
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
