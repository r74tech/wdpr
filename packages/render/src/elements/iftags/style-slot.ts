import type { IfTagsData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";

interface StyleSlotIfTagsData extends IfTagsData {
  _styleSlot?: number;
}

export function withIfTagsStyleSlot(ctx: RenderContext, data: IfTagsData, render: () => void): void {
  const slotId = (data as StyleSlotIfTagsData)._styleSlot;
  if (slotId !== undefined) {
    ctx.enterStyleSlot(slotId);
  }

  render();

  if (slotId !== undefined) {
    ctx.exitStyleSlot();
  }
}
