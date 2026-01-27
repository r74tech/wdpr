import type { IfTagsData } from "@wdpr/ast";
import type { RenderContext } from "../context";
import { renderElements } from "../render";

/** Render if-tags - renders the resolved elements */
export function renderIfTags(ctx: RenderContext, data: IfTagsData): void {
  renderElements(ctx, data.elements);
}
