import type { Element } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderElements } from "../../render";
import { renderContainerAttrs } from "./attributes";

export function renderWrapped(
  ctx: RenderContext,
  tag: string,
  attributes: Record<string, string>,
  elements: Element[],
): void {
  ctx.push(`<${tag}${renderContainerAttrs(attributes)}>`);
  renderElements(ctx, elements);
  ctx.push(`</${tag}>`);
}

export function renderPlainWrapped(ctx: RenderContext, tag: string, elements: Element[]): void {
  ctx.push(`<${tag}>`);
  renderElements(ctx, elements);
  ctx.push(`</${tag}>`);
}

export function renderStyledSpan(
  ctx: RenderContext,
  style: string,
  attributes: Record<string, string>,
  elements: Element[],
): void {
  ctx.push(`<span style="${style}"${renderContainerAttrs(attributes)}>`);
  renderElements(ctx, elements);
  ctx.push("</span>");
}
