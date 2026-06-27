import type { Element } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderElements } from "../../render";
import { renderContainerAttrs } from "./attributes";

/**
 * Render a heading element (`h1`..`h6`).
 */
export function renderHeader(
  ctx: RenderContext,
  level: number,
  hasToc: boolean,
  attributes: Record<string, string>,
  elements: Element[],
): void {
  const tag = `h${level}`;
  if (hasToc) {
    const tocId = ctx.generateId("toc", ctx.nextTocIndex());
    ctx.push(`<${tag} id="${tocId}"${renderContainerAttrs(attributes)}>`);
  } else {
    ctx.push(`<${tag}${renderContainerAttrs(attributes)}>`);
  }
  ctx.push("<span>");
  renderElements(ctx, elements);
  ctx.push("</span>");
  ctx.push(`</${tag}>`);
}
