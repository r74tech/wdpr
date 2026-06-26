/**
 *
 * Renderer for `[[code]]...[[/code]]` blocks in Wikidot markup.
 *
 * @module
 */

import type { CodeBlockData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderCodeContents } from "./contents";

/**
 * Render a `[[code]]` block.
 *
 * The block is wrapped in `<div class="code">`. If the block is empty,
 * the div is closed immediately with no inner content.
 *
 * @param ctx - The current render context.
 * @param data - Code block data containing contents and optional language.
 */
export function renderCode(ctx: RenderContext, data: CodeBlockData): void {
  ctx.push(`<div class="code">`);

  if (data.contents !== "") {
    ctx.push(renderCodeContents(data));
  }

  ctx.push("</div>");
}
