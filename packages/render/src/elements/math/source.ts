import type { RenderContext } from "../../context";
import { escapeHtml } from "../../escape";

export function pushHiddenLatexSource(ctx: RenderContext, latex: string): void {
  ctx.push(`<code class="math-source" hidden aria-hidden="true">`);
  ctx.push(escapeHtml(latex));
  ctx.push(`</code>`);
}

export function pushMathRender(
  ctx: RenderContext,
  mathml: string,
  fallback: () => void,
): void {
  ctx.push(`<span class="math-render">`);
  if (mathml) {
    ctx.push(mathml);
  } else {
    fallback();
  }
  ctx.push(`</span>`);
}
