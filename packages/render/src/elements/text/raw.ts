import type { RenderContext } from "../../context";
import { escapeHtml } from "../../escape";

/**
 * Render raw/literal text (Wikidot `@@...@@` syntax).
 *
 * Raw text is rendered inside a `<span style="white-space: pre-wrap;">` with
 * spaces encoded as `&#32;` to preserve Wikidot's exact formatting. Empty
 * strings produce no output.
 *
 * @param ctx - The current render context.
 * @param data - The raw text content.
 */
export function renderRaw(ctx: RenderContext, data: string): void {
  if (data === "") return;

  ctx.push(`<span style="white-space: pre-wrap;">`);
  ctx.push(escapeHtml(data).replace(/ /g, "&#32;"));
  ctx.push("</span>");
}
