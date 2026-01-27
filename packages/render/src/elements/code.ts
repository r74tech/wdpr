import type { CodeBlockData } from "@wdpr/ast";
import type { RenderContext } from "../context";
import { escapeHtml } from "../escape";
import { highlight } from "../libs/highlighter";

/** Render a code block */
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
