import type { RenderContext } from "../../context";

/**
 * Render a plain text node by HTML-escaping and appending to the output.
 *
 * @param ctx - The current render context.
 * @param data - The raw text content.
 */
export function renderText(ctx: RenderContext, data: string): void {
  ctx.pushEscaped(data);
}
