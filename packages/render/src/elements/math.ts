import type { MathData, MathInlineData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, escapeHtml } from "../escape";
import temml from "temml";

/**
 * Check if LaTeX needs to be wrapped in aligned environment.
 * Wikidot-style math blocks with & alignment markers need this.
 */
function needsAlignedWrapper(latex: string): boolean {
  // Already has an environment
  if (/\\begin\s*\{/.test(latex)) {
    return false;
  }
  // Has alignment marker (&) but not escaped (\&) - needs aligned environment
  // Remove escaped ampersands first, then check for unescaped ones
  const withoutEscaped = latex.replace(/\\&/g, "");
  return withoutEscaped.includes("&");
}

/**
 * Render LaTeX to MathML using temml.
 * Returns empty string on error.
 */
function renderLatexToMathML(latex: string, displayMode: boolean): string {
  try {
    // Wrap in aligned environment if needed for Wikidot-style alignment
    let processedLatex = latex;
    if (displayMode && needsAlignedWrapper(latex)) {
      processedLatex = `\\begin{aligned}\n${latex}\n\\end{aligned}`;
    }
    return temml.renderToString(processedLatex, {
      displayMode,
      throwOnError: false,
      annotate: false,
    });
  } catch {
    return "";
  }
}

/** Render a block math element */
export function renderMath(ctx: RenderContext, data: MathData): void {
  const index = ctx.nextEquationIndex() + 1;
  const latex = data["latex-source"];
  const mathml = renderLatexToMathML(latex, true);

  const id = data.name
    ? ctx.generateId("equation-", data.name)
    : ctx.generateId("equation-", index);
  const dataName = data.name ? ` data-name="${escapeAttr(data.name)}"` : "";

  ctx.push(`<div class="math-block" id="${escapeAttr(id)}"${dataName}>`);

  // Equation number (only for named equations)
  if (data.name) {
    ctx.push(`<span class="equation-number">(${index})</span>`);
  }

  // Hidden LaTeX source (for polyfill)
  ctx.push(`<code class="math-source" hidden aria-hidden="true">`);
  ctx.push(escapeHtml(latex));
  ctx.push(`</code>`);

  // MathML output
  ctx.push(`<span class="math-render">`);
  if (mathml) {
    ctx.push(mathml);
  } else {
    // Fallback: display error
    ctx.push(`<span class="math-error">`);
    ctx.push(escapeHtml(latex));
    ctx.push(`</span>`);
  }
  ctx.push(`</span>`);

  ctx.push("</div>");
}

/** Render an inline math element */
export function renderMathInline(ctx: RenderContext, data: MathInlineData): void {
  const latex = data["latex-source"];
  const mathml = renderLatexToMathML(latex, false);

  ctx.push(`<span class="math-inline">`);

  // Hidden LaTeX source (for polyfill)
  ctx.push(`<code class="math-source" hidden aria-hidden="true">`);
  ctx.push(escapeHtml(latex));
  ctx.push(`</code>`);

  // MathML output
  ctx.push(`<span class="math-render">`);
  if (mathml) {
    ctx.push(mathml);
  } else {
    // Fallback: display with $ delimiters
    ctx.push(`<span class="math-error">$`);
    ctx.push(escapeHtml(latex));
    ctx.push(`$</span>`);
  }
  ctx.push(`</span>`);

  ctx.push("</span>");
}

/** Render an equation reference (link to named equation) */
export function renderEquationRef(ctx: RenderContext, name: string): void {
  const id = ctx.generateId("equation-", name);
  ctx.push(`<span class="eref" data-target="${escapeAttr(id)}">`);
  ctx.push(`<a class="eref-link" href="#${escapeAttr(id)}">`);
  ctx.push(escapeHtml(name));
  ctx.push(`</a>`);
  ctx.push(`<span class="eref-tooltip" aria-hidden="true"></span>`);
  ctx.push("</span>");
}
