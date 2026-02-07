/**
 * @module elements/math
 *
 * Renderers for Wikidot mathematical notation elements.
 *
 * - `[[math]]...[[/math]]` -- display-mode (block) math
 * - `[[$ ... $]]` -- inline math
 * - `[[eref name]]` -- equation reference (link to named equation)
 *
 * LaTeX source is converted to MathML using the `temml` library at
 * render time. A hidden `<code class="math-source">` element preserves
 * the original LaTeX for use by the runtime `math` module's SVG polyfill
 * (for browsers without MathML support).
 *
 * Named equations receive an `(N)` equation number and can be
 * cross-referenced via `[[eref]]`.
 */

import type { MathData, MathInlineData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, escapeHtml } from "../escape";
import temml from "temml";

/**
 * Determine whether a LaTeX string needs to be wrapped in an `aligned`
 * environment.
 *
 * Wikidot-style multi-line equations use `&` as alignment markers without
 * explicitly declaring an `aligned` environment. If the LaTeX contains
 * unescaped `&` characters but no `\begin{...}` environment declaration,
 * an `aligned` wrapper is added to make the alignment work correctly.
 *
 * @param latex - Raw LaTeX source string.
 * @returns `true` if the LaTeX needs an `aligned` environment wrapper.
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
 * Render a LaTeX string to MathML using the `temml` library.
 *
 * For display-mode equations with alignment markers, the LaTeX is
 * automatically wrapped in an `aligned` environment.
 *
 * @param latex - LaTeX source string.
 * @param displayMode - Whether to render in display mode (block) or inline.
 * @returns MathML string, or `""` if rendering fails.
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

/**
 * Render a `[[math]]` display-mode block equation.
 *
 * Produces a `<div class="math-block">` containing:
 * - An optional equation number `<span class="equation-number">` for named equations
 * - A hidden `<code class="math-source">` with the raw LaTeX (for polyfill use)
 * - A `<span class="math-render">` with the MathML output (or error fallback)
 *
 * @param ctx - The current render context.
 * @param data - Math block data with LaTeX source and optional equation name.
 */
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

/**
 * Render an inline math element (`[[$...$]]`).
 *
 * Produces a `<span class="math-inline">` containing:
 * - A hidden `<code class="math-source">` with the raw LaTeX
 * - A `<span class="math-render">` with the MathML output (or `$...$` error fallback)
 *
 * @param ctx - The current render context.
 * @param data - Inline math data with LaTeX source.
 */
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

/**
 * Render an equation reference (`[[eref name]]`) that links to a named equation.
 *
 * Produces a `<span class="eref">` containing a link to the equation's
 * `#equation-{name}` ID and an empty tooltip span that the runtime
 * `math` module populates on hover with a preview of the equation.
 *
 * @param ctx - The current render context.
 * @param name - The equation name to reference.
 */
export function renderEquationRef(ctx: RenderContext, name: string): void {
  const id = ctx.generateId("equation-", name);
  ctx.push(`<span class="eref" data-target="${escapeAttr(id)}">`);
  ctx.push(`<a class="eref-link" href="#${escapeAttr(id)}">`);
  ctx.push(escapeHtml(name));
  ctx.push(`</a>`);
  ctx.push(`<span class="eref-tooltip" aria-hidden="true"></span>`);
  ctx.push("</span>");
}
