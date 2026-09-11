import type { RenderContext } from "../../context";
import { escapeAttr, escapeHtml } from "../../escape";

export function renderEquationRef(ctx: RenderContext, name: string): void {
  ctx.pushDeferred(() => {
    const index = ctx.getEquationIndex(name);
    const label = escapeAttr(name);
    if (index === undefined) {
      return `<span class="eref" data-name="${label}">${escapeHtml(name)}</span>`;
    }
    const id = escapeAttr(ctx.generateId("equation-", index));
    return (
      `<span class="eref" data-name="${label}" data-target="${id}">` +
      `<a class="eref-link" href="#${id}">${index}</a>` +
      `<span class="eref-tooltip" aria-hidden="true"></span></span>`
    );
  });
}
