/**
 *
 * Renderers for Wikidot link elements.
 *
 * Wikidot supports page links, external links, anchor-type links,
 * `[[a]]...[[/a]]` anchors, and named anchors.
 *
 * @module
 */

import type { LinkData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderAnchor } from "./anchor";
import { renderAnchorName } from "./anchor-name";
import { getLinkAttributes } from "./attributes";
import { renderLinkLabel } from "./label";

export { renderAnchor, renderAnchorName };

export function renderLink(ctx: RenderContext, data: LinkData): void {
  const attrs = getLinkAttributes(ctx, data);

  ctx.push(`<a ${attrs.join(" ")}>`);
  renderLinkLabel(ctx, data);
  ctx.push("</a>");
}
