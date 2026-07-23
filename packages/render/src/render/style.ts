import { STYLE_ANCHOR_PREFIX } from "@wdprlib/ast";
import { RenderContext } from "../context";
import { pushStyleTag } from "./style-tag";

export function renderStyleElement(ctx: RenderContext, css: string): void {
  if (css.startsWith(STYLE_ANCHOR_PREFIX)) return;

  if (!ctx.renderInlineStyles || !ctx.settings.allowStyleElements) {
    return;
  }

  if (ctx.hasActiveStyleSlot()) {
    ctx.pushToStyleSlot(css);
    return;
  }

  pushStyleTag(ctx, css);
}
