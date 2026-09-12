import type { Element } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderElements } from "../../render";
import { hasAttributes } from "./attributes";
import { getStringContainerRendering, isContentsOnlyStringContainer } from "./string-types";
import { renderPlainWrapped, renderStyledSpan, renderWrapped } from "./wrappers";

/**
 * Render a container whose type is a plain string identifier.
 */
export function renderStringContainer(
  ctx: RenderContext,
  type: string,
  attributes: Record<string, string>,
  elements: Element[],
): void {
  if (type === "note") {
    renderWrapped(ctx, "div", { ...attributes, class: "wiki-note" }, elements);
    return;
  }

  if (type === "div" && elements.length === 0 && !hasAttributes(attributes)) {
    return;
  }

  if (isContentsOnlyStringContainer(type)) {
    renderElements(ctx, elements);
    return;
  }

  const rendering = getStringContainerRendering(type);
  switch (rendering.kind) {
    case "wrapped":
      renderWrapped(ctx, rendering.tag, attributes, elements);
      return;
    case "styled-span":
      renderStyledSpan(ctx, rendering.style, attributes, elements);
      return;
    case "plain-wrapped":
      renderPlainWrapped(ctx, rendering.tag, elements);
      return;
    case "contents":
      renderElements(ctx, elements);
  }
}
