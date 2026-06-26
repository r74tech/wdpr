import type { Element } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderElement, renderElements } from "../../render";
import { getParagraphIndices, isLiCloseTextParagraph, isParagraphElement, type ParagraphElement } from "./paragraphs";
import { trimTextElements } from "./trim";

export function renderNoMarkerElements(ctx: RenderContext, elements: Element[]): void {
  const trimmed = trimTextElements(elements);
  if (trimmed.length === 0) return;

  const paragraphIndices = getParagraphIndices(trimmed);
  if (paragraphIndices.length === 0) {
    renderElements(ctx, trimmed);
    return;
  }

  const firstParagraphIdx = paragraphIndices[0]!;
  const lastParagraphIdx = paragraphIndices[paragraphIndices.length - 1]!;

  for (let i = 0; i < trimmed.length; i++) {
    const el = trimmed[i]!;
    if (isParagraphElement(el)) {
      renderNoMarkerParagraph(ctx, el, i, firstParagraphIdx, lastParagraphIdx);
    } else {
      renderElement(ctx, el);
    }
  }
}

function renderNoMarkerParagraph(
  ctx: RenderContext,
  element: ParagraphElement,
  index: number,
  firstParagraphIdx: number,
  lastParagraphIdx: number,
): void {
  if (index === firstParagraphIdx || (index === lastParagraphIdx && isLiCloseTextParagraph(element))) {
    renderElements(ctx, element.data.elements);
    return;
  }

  ctx.push("<p>");
  renderElements(ctx, element.data.elements);
  ctx.push("</p>");
}
