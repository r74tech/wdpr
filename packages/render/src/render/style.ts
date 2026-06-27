import { RenderContext } from "../context";
import { pushStyleTag } from "./style-tag";

export function renderStyleElement(ctx: RenderContext, css: string): void {
  if (!ctx.renderInlineStyles || !ctx.settings.allowStyleElements) {
    return;
  }

  if (ctx.hasActiveStyleSlot()) {
    ctx.pushToStyleSlot(css);
    return;
  }

  pushStyleTag(ctx, css);
}
