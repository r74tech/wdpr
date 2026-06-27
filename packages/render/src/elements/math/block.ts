import type { MathData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { escapeAttr, escapeHtml } from "../../escape";
import { renderLatexToMathML } from "./latex";
import { pushHiddenLatexSource, pushMathRender } from "./source";

export function renderMath(ctx: RenderContext, data: MathData): void {
  const index = ctx.nextEquationIndex() + 1;
  const latex = data["latex-source"];
  const mathml = renderLatexToMathML(latex, true);

  const id = data.name
    ? ctx.generateId("equation-", data.name)
    : ctx.generateId("equation-", index);
  const dataName = data.name ? ` data-name="${escapeAttr(data.name)}"` : "";

  ctx.push(`<div class="math-block" id="${escapeAttr(id)}"${dataName}>`);
  if (data.name) {
    ctx.push(`<span class="equation-number">(${index})</span>`);
  }

  pushHiddenLatexSource(ctx, latex);
  pushMathRender(ctx, mathml, () => {
    ctx.push(`<span class="math-error">`);
    ctx.push(escapeHtml(latex));
    ctx.push(`</span>`);
  });
  ctx.push("</div>");
}
