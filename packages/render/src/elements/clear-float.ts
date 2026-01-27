import type { ClearFloat } from "@wdpr/ast";
import type { RenderContext } from "../context";

/** Render clear-float */
export function renderClearFloat(ctx: RenderContext, direction: ClearFloat): void {
  ctx.push(`<div style="clear:${direction}; height: 0px; font-size: 1px"></div>`);
}
