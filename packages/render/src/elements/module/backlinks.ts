import type { Module } from "@wdpr/ast";
import type { RenderContext } from "../../context";

export function renderBacklinks(
  ctx: RenderContext,
  _data: Extract<Module, { module: "backlinks" }>,
): void {
  // Wikidot outputs just the container div (backlinks are populated at runtime)
  ctx.push(`<div class="backlinks-module-box">\n\t</div>`);
}
