import type { MathInlineData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { escapeHtml } from "../../escape";
import { renderLatexToMathML } from "./latex";
import { pushHiddenLatexSource, pushMathRender } from "./source";

export function renderMathInline(ctx: RenderContext, data: MathInlineData): void {
  const latex = data["latex-source"];
  const mathml = renderLatexToMathML(latex, false);

  ctx.push(`<span class="math-inline">`);
  pushHiddenLatexSource(ctx, latex);
  pushMathRender(ctx, mathml, () => {
    ctx.push(`<span class="math-error">$`);
    ctx.push(escapeHtml(latex));
    ctx.push(`$</span>`);
  });
  ctx.push("</span>");
}
