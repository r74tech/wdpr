import type { RenderContext } from "../../context";
import { escapeAttr } from "../../escape";

export function renderAnchorName(ctx: RenderContext, name: string): void {
  ctx.push(`<a name="${escapeAttr(name)}"></a>`);
}
