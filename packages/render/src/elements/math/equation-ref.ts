import type { RenderContext } from "../../context";
import { escapeAttr, escapeHtml } from "../../escape";

export function renderEquationRef(ctx: RenderContext, name: string): void {
  const id = ctx.generateId("equation-", name);
  ctx.push(`<span class="eref" data-target="${escapeAttr(id)}">`);
  ctx.push(`<a class="eref-link" href="#${escapeAttr(id)}">`);
  ctx.push(escapeHtml(name));
  ctx.push(`</a>`);
  ctx.push(`<span class="eref-tooltip" aria-hidden="true"></span>`);
  ctx.push("</span>");
}
