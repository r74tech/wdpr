/**
 *
 * Renderer for `[[iframe URL]]` inline iframe elements.
 *
 * @module
 */

import type { IframeData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { getIframeAttributes } from "./attributes";

/**
 * Render an `[[iframe URL]]` element.
 *
 * The iframe is wrapped in a `<p>` element to match Wikidot's output.
 *
 * @param ctx - The current render context.
 * @param data - Iframe data containing the URL and attribute map.
 */
export function renderIframe(ctx: RenderContext, data: IframeData): void {
  ctx.push(`<p><iframe ${getIframeAttributes(data).join(" ")}></iframe></p>`);
}
