import type { BibliographyCiteData, BibliographyBlockData, Element } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeHtml } from "../escape";

/**
 * Generate a short hash for unique IDs (Wikidot uses random-ish suffixes)
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
 * Render bibliography cite: ((bibcite label))
 *
 * Output: <a href="javascript:;" class="bibcite" id="bibcite-N-XXXXX"
 *          onclick="WIKIDOT.page.utils.scrollToReference('bibitem-N')">N</a>
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
  const id = `bibcite-${number}-${idSuffix}`;
  const onclick = `WIKIDOT.page.utils.scrollToReference('bibitem-${number}')`;

  ctx.push(`<a href="javascript:;" class="bibcite" id="${id}" onclick="${escapeHtml(onclick)}">`);
  ctx.push(String(number));
  ctx.push("</a>");
}

/**
 * Render bibliography block: [[bibliography]]...[[/bibliography]]
 *
 * Output:
 * <div class="bibitems">
 *   <div class="title">Bibliography</div>
 *   <div class="bibitem" id="bibitem-1">1. Content...</div>
 *   ...
 * </div>
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
    ctx.push(`<div class="bibitem" id="bibitem-${index}">`);
    ctx.push(`${index}. `);
    renderElements(ctx, entry.value);
    ctx.push("</div>");
    index++;
  }

  ctx.push("</div>");
}
