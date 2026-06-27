import type { RenderContext } from "../context";
import { escapeStyleContent } from "../escape";

export function pushStyleTag(ctx: RenderContext, css: string): void {
  ctx.push(`<style>${escapeStyleContent(css)}</style>`);
}
