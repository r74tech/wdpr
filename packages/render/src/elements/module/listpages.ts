import type { Module } from "@wdprlib/ast";
import type { RenderContext } from "../../context";

export function renderListPages(
  ctx: RenderContext,
  _data: Extract<Module, { module: "list-pages" }>,
): void {
  ctx.push(`<div class="list-pages-box">`);
  ctx.push("</div>");
}
