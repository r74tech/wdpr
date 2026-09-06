import type { Module } from "@wdprlib/ast";
import type { RenderContext } from "../../context";

export function renderUnknownModule(
  ctx: RenderContext,
  data: Extract<Module, { module: "unknown" }>,
): void {
  ctx.push(
    `<div class="error-block">${ctx.messages.html(
      {
        id: "module.unknown",
        defaultMessage:
          "[[module <emphasis>{name}</emphasis>]] No such module, please <documentationLink>check available modules</documentationLink> and fix this page.",
      },
      { name: data.name },
      {
        emphasis: (html) => `<em>${html}</em>`,
        documentationLink: (html) =>
          `<a href="https://www.wikidot.com/doc:modules" target="_blank" rel="noopener noreferrer">${html}</a>`,
      },
    )}</div>`,
  );
}
