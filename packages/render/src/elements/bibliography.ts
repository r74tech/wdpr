/**
 * @module elements/bibliography
 *
 * Renderers for Wikidot bibliography markup.
 *
 * Wikidot provides two related constructs:
 * - `((bibcite label))` -- an inline citation reference that links to a
 *   bibliography entry and displays a superscript citation number.
 * - `[[bibliography]]...[[/bibliography]]` -- a block that lists all
 *   bibliography entries as a numbered definition list.
 *
 * Citation numbers are assigned globally (across all bibliography blocks)
 * by the {@link RenderContext} during construction. If a label is unknown,
 * the citation is rendered as plain text.
 */

import type { BibliographyCiteData, BibliographyBlockData, Element } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr, escapeHtml } from "../escape";

/**
 * Generate a short FNV-1a-based hex suffix for unique bibliography IDs.
 *
 * Wikidot uses random-ish suffixes on `bibcite` element IDs to avoid
 * collisions when the same label is cited multiple times on one page.
 *
 * @param label - The bibliography label string.
 * @param counter - A monotonically increasing counter from the context.
 * @returns A 6-character lowercase hex string.
 */
function generateIdSuffix(label: string, counter: number): string {
  // Simple hash based on label and counter
  let h = 0x811c9dc5;
  const input = label + counter;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).slice(0, 6);
}

/**
 * Render an inline bibliography citation reference: `((bibcite label))`.
 *
 * Produces a clickable superscript link that scrolls to the corresponding
 * bibliography entry. The rendered HTML structure matches Wikidot output:
 *
 * ```html
 * <a href="javascript:;" class="bibcite" id="bibcite-N-XXXXX"
 *    onclick="WIKIDOT.page.utils.scrollToReference('bibitem-N')">N</a>
 * ```
 *
 * If the label does not match any bibliography entry, the raw label text
 * is rendered instead.
 *
 * @param ctx - The current render context.
 * @param data - Citation data containing the bibliography label.
 */
export function renderBibliographyCite(ctx: RenderContext, data: BibliographyCiteData): void {
  const number = ctx.bibliographyMap.get(data.label);
  const counter = ctx.nextBibciteCounter();

  if (number === undefined) {
    // Unknown label - render as text
    ctx.push(escapeHtml(data.label));
    return;
  }

  const idSuffix = generateIdSuffix(data.label, counter);
  const id = ctx.generateId(`bibcite-${number}-`, idSuffix);
  const bibitemId = ctx.generateId("bibitem-", number);
  const onclick = `WIKIDOT.page.utils.scrollToReference('${bibitemId}')`;

  ctx.push(`<a href="javascript:;" class="bibcite" id="${id}" onclick="${escapeAttr(onclick)}">`);
  ctx.push(String(number));
  ctx.push("</a>");
}

/**
 * Render a bibliography block: `[[bibliography]]...[[/bibliography]]`.
 *
 * Produces a Wikidot-compatible numbered list of bibliography entries:
 *
 * ```html
 * <div class="bibitems">
 *   <div class="title">Bibliography</div>
 *   <div class="bibitem" id="bibitem-1">1. Content...</div>
 *   ...
 * </div>
 * ```
 *
 * If `data.hide` is true, the block is suppressed (entries still participate
 * in citation numbering but are not rendered visually).
 *
 * @param ctx - The current render context.
 * @param data - Bibliography block data containing entries and optional title/hide flags.
 * @param renderElements - Callback to render child elements within each entry.
 */
export function renderBibliographyBlock(
  ctx: RenderContext,
  data: BibliographyBlockData,
  renderElements: (ctx: RenderContext, elements: Element[]) => void,
): void {
  if (data.hide) return;

  const title = data.title ?? "Bibliography";

  ctx.push(`<div class="bibitems">`);
  ctx.push(`<div class="title">${escapeHtml(title)}</div>`);

  let index = 1;
  for (const entry of data.entries) {
    const itemId = ctx.generateId("bibitem-", index);
    ctx.push(`<div class="bibitem" id="${itemId}">`);
    ctx.push(`${index}. `);
    renderElements(ctx, entry.value);
    ctx.push("</div>");
    index++;
  }

  ctx.push("</div>");
}
