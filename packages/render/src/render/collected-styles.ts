import { STYLE_SLOT_PREFIX } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { pushStyleTag } from "./style-tag";

export function renderCollectedStyles(ctx: RenderContext, styles: string[] | undefined): void {
  if (!ctx.settings.allowStyleElements || !styles?.length) return;

  for (const style of styles) {
    if (style.startsWith(STYLE_SLOT_PREFIX)) {
      renderStyleSlot(ctx, style);
    } else {
      pushStyleTag(ctx, style);
    }
  }
}

function renderStyleSlot(ctx: RenderContext, marker: string): void {
  const slotId = parseInt(marker.slice(STYLE_SLOT_PREFIX.length), 10);
  for (const css of ctx.getStyleSlotContents(slotId)) {
    pushStyleTag(ctx, css);
  }
}
