import type { Module } from "@wdprlib/ast";
import type { RenderContext } from "../../context";

export function renderPageTree(
  ctx: RenderContext,
  _data: Extract<Module, { module: "page-tree" }>,
): void {
  ctx.push(`<div class="page-tree-module-box">`);
  ctx.push("</div>");
}
