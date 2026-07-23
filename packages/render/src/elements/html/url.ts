import type { RenderContext } from "../../context";
import { syncHashSha1 } from "../../hash";

export function resolveHtmlBlockUrl(ctx: RenderContext, contents: string, index: number): string {
  const callbackUrl = ctx.options.resolvers?.htmlBlockUrl?.(index, contents);
  return callbackUrl || generateDefaultHtmlBlockUrl(ctx.page?.pageName ?? "", contents);
}

/**
 * Generate a default iframe `src` URL for an HTML block when no
 * resolver callback is provided.
 *
 * The URL follows Wikidot's pattern: `/{pageName}/html/{hash}-{nonce}`.
 */
function generateDefaultHtmlBlockUrl(pageName: string, contents: string): string {
  const hash = syncHashSha1(contents);
  const nonce = BigInt(contents.length) * 1000000000n + BigInt(hash.charCodeAt(0)) * 100000000n;
  return pageName ? `/${pageName}/html/${hash}-${nonce}` : `/html/${hash}-${nonce}`;
}
