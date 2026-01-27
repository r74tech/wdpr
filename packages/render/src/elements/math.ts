import type { MathData, MathInlineData } from "@wdpr/ast";
import type { RenderContext } from "../context";
import { escapeAttr, escapeHtml } from "../escape";

/** Render a block math element */
export function renderMath(ctx: RenderContext, data: MathData): void {
  const index = ctx.nextEquationIndex() + 1;

  if (data.name) {
    ctx.push(`<span class="equation-number">(${index})</span>`);
  }

  const id = data.name ? `equation-${data.name}` : `equation-${index}`;
  ctx.push(`<div class="math-equation" id="${escapeAttr(id)}">`);
  ctx.push(escapeHtml(data["latex-source"]));
  ctx.push("</div>");
}

/** Render an inline math element */
export function renderMathInline(ctx: RenderContext, data: MathInlineData): void {
  ctx.push(`<span class="math-inline">$`);
  ctx.push(escapeHtml(data["latex-source"]));
  ctx.push("$</span>");
}

/** Render an equation reference (link to named equation) */
export function renderEquationRef(ctx: RenderContext, name: string): void {
  // Create a link to the named equation
  // The equation index is not available at render time without tracking,
  // so we generate a link that can be resolved client-side or with post-processing
  const id = `equation-${name}`;
  ctx.push(`<a class="equation-ref" href="#${escapeAttr(id)}">`);
  ctx.push(escapeHtml(name));
  ctx.push("</a>");
}
