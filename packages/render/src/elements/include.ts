import type { IncludeData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { renderElements } from "../render";

/** Render include - just renders the resolved elements */
export function renderInclude(ctx: RenderContext, data: IncludeData): void {
  renderElements(ctx, data.elements);
}
