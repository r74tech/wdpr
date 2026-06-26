import type { Module } from "@wdprlib/ast";
import type { RenderContext } from "../../context";

export function renderUnknownModule(
  ctx: RenderContext,
  data: Extract<Module, { module: "unknown" }>,
): void {
  ctx.push(
    `<div class="error-block">[[module <em>${data.name}</em>]] No such module, please <a href="https://www.wikidot.com/doc:modules" target="_blank" rel="noopener noreferrer">check available modules</a> and fix this page.</div>`,
  );
}
