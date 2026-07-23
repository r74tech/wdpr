import type { RenderContext } from "../context";
import { escapeStyleContent } from "../escape";

export function pushStyleTag(ctx: RenderContext, css: string): void {
  if (!ctx.recordStyle(css)) return;
  ctx.push(`<style>${escapeStyleContent(css)}</style>`);
}
