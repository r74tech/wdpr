/**
 * Renderer for general container AST elements.
 *
 * @module
 */

import type { ContainerData } from "@wdprlib/ast";
import { isAlignType, isHeaderType, isStringContainerType } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderElements } from "../../render";
import { renderHeader } from "./header";
import { renderStringContainer } from "./string-container";

/**
 * Render a container element by dispatching on its `type` discriminant.
 */
export function renderContainer(ctx: RenderContext, data: ContainerData): void {
  const { type, attributes, elements } = data;

  if (isHeaderType(type)) {
    renderHeader(ctx, type.header.level, type.header["has-toc"], attributes, elements);
    return;
  }

  if (isAlignType(type)) {
    ctx.push(`<div style="text-align: ${type.align};">`);
    renderElements(ctx, elements);
    ctx.push("</div>");
    return;
  }

  if (isStringContainerType(type)) {
    renderStringContainer(ctx, type, attributes, elements);
  }
}
