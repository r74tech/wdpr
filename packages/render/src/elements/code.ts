/**
 *
 * Renderer for `[[code]]...[[/code]]` blocks in Wikidot markup.
 *
 * When a `language` attribute is specified and the language is supported
 * by the built-in highlighter (a TypeScript port of PEAR Text_Highlighter),
 * the code is syntax-highlighted with `hl-*` CSS class spans. Otherwise,
 * the code is rendered as plain escaped text inside `<pre><code>`.
 *
 * @module
 */

import type { CodeBlockData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeHtml } from "../escape";
import { highlight } from "../libs/highlighter";

/**
 * Render a `[[code]]` block.
 *
 * The block is wrapped in `<div class="code">`. If the block is empty,
 * the div is closed immediately with no inner content. When a language
 * is specified and supported, the highlighter produces
 * `<div class="hl-main"><pre>...</pre></div>` with token-level spans.
 *
 * @param ctx - The current render context.
 * @param data - Code block data containing contents and optional language.
 */
export function renderCode(ctx: RenderContext, data: CodeBlockData): void {
  ctx.push(`<div class="code">`);

  if (data.contents === "") {
    ctx.push("</div>");
    return;
  }

  if (data.language) {
    const highlighted = highlight(data.contents, data.language);
    if (highlighted) {
      ctx.push(highlighted);
    } else {
      ctx.push(`<pre><code>${escapeHtml(data.contents)}</code></pre>`);
    }
  } else {
    ctx.push(`<pre><code>${escapeHtml(data.contents)}</code></pre>`);
  }

  ctx.push("</div>");
}
