/**
 *
 * Renderer for `[[toc]]` (Table of Contents) elements.
 *
 * @module
 */

import type { TableOfContentsData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderTocBody } from "./body";
import { closeTocFrame, openTocFrame } from "./frame";

export function renderTableOfContents(ctx: RenderContext, data: TableOfContentsData): void {
  openTocFrame(ctx, data.align);
  renderTocBody(ctx, data.attributes?.title);
  closeTocFrame(ctx, data.align);
}
