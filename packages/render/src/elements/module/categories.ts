import type { Module } from "@wdprlib/ast";
import type { RenderContext } from "../../context";

export function renderCategories(
  ctx: RenderContext,
  _data: Extract<Module, { module: "categories" }>,
): void {
  ctx.push(`<div class="categories-module-box">`);
  ctx.push("</div>");
}
