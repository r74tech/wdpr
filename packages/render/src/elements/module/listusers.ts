import type { Module } from "@wdpr/ast";
import type { RenderContext } from "../../context";

export function renderListUsers(
  ctx: RenderContext,
  _data: Extract<Module, { module: "list-users" }>,
): void {
  ctx.push(`<div class="list-users-module-box">`);
  ctx.push("</div>");
}
