/**
 *
 * Runtime module for bibliography citation hover tooltips and click-to-scroll.
 *
 * Sets up delegated `mouseenter`/`mouseleave` event listeners on the root
 * element to detect hover over `a.bibcite` links. On hover, a Wikidot-style
 * tooltip is built from the corresponding bibliography entry and displayed
 * near the citation link.
 *
 * DOM interactions:
 * - Listens for `mouseenter` (capture) on `a.bibcite` links to show tooltip
 * - Listens for `mouseleave` (capture) on `a.bibcite` links to hide tooltip
 * - Queries `#bibitem-{N}` elements to build tooltip content
 *
 * The `destroy()` cleanup function removes both event listeners.
 *
 * @module
 */

import type { ModuleCleanup } from "./types";
import { isElement } from "./utils/dom";
import { hideTooltip, showTooltipEl } from "./utils/tooltip";

/**
 * Initialize bibliography citation tooltips within the given root element.
 *
 * Attaches delegated `mouseenter` and `mouseleave` listeners (using capture
 * phase) to display Wikidot-compatible hover tooltips when the user hovers
 * over `a.bibcite` links. The tooltip shows the bibliography entry content
 * with a heading and a footer instruction.
 *
 * @param root - The root DOM element containing rendered Wikidot markup.
 * @returns A cleanup handle whose `destroy()` method removes all listeners.
 */
export function initBibcite(root: HTMLElement): ModuleCleanup {
  function handleMouseEnter(e: Event): void {
    const target = e.target;
    if (!isElement(target)) return;
    const link = target.closest<HTMLAnchorElement>("a.bibcite");
    if (!link) return;

    const href = link.getAttribute("href");
    if (!href?.startsWith("#")) return;

    const bibitem = root.ownerDocument.getElementById(href.slice(1));
    if (!bibitem) return;

    const id = href.slice(1).replace(/^bibitem-/, "");
    const tip = buildBibciteTooltip(root.ownerDocument, bibitem, id);
    showTooltipEl(link, tip);
  }

  function handleMouseLeave(e: Event): void {
    const target = e.target;
    if (!isElement(target)) return;
    if (target.closest("a.bibcite")) {
      hideTooltip();
    }
  }

  root.addEventListener("mouseenter", handleMouseEnter, true);
  root.addEventListener("mouseleave", handleMouseLeave, true);

  return {
    destroy() {
      root.removeEventListener("mouseenter", handleMouseEnter, true);
      root.removeEventListener("mouseleave", handleMouseLeave, true);
    },
  };
}

/**
 * Build a Wikidot-compatible bibliography tooltip element.
 *
 * Structure: `.hovertip > .content > .reference > .r-heading + .r-content + .r-footer`
 *
 * The tooltip clones the bibliography entry content and strips the leading
 * `"N. "` numbering prefix so the tooltip shows only the entry text.
 *
 * @param doc - The owner document for DOM element creation.
 * @param bibitemEl - The `.bibitem` element to extract content from.
 * @param id - The numeric ID of the bibliography entry (for the heading).
 * @returns A detached tooltip DOM element ready for positioning and display.
 */
function buildBibciteTooltip(doc: Document, bibitemEl: HTMLElement, id: string): HTMLElement {
  const tip = doc.createElement("div");
  tip.className = "hovertip";
  tip.style.width = "auto";
  tip.style.backgroundColor = "white";

  const content = doc.createElement("div");
  content.className = "content";

  const refWrap = doc.createElement("div");
  refWrap.className = "reference";

  const heading = doc.createElement("div");
  heading.className = "r-heading";
  heading.textContent = `Reference ${id}.`;
  refWrap.appendChild(heading);

  // Clone bibitem content, removing leading "N. "
  const rContent = doc.createElement("div");
  rContent.className = "r-content";
  const clone = bibitemEl.cloneNode(true) as HTMLElement;
  const firstText = clone.firstChild;
  if (firstText?.nodeType === Node.TEXT_NODE) {
    firstText.textContent = firstText.textContent?.replace(/^\s*[0-9]+\.\s*/, "") ?? "";
  }
  while (clone.firstChild) rContent.appendChild(clone.firstChild);
  refWrap.appendChild(rContent);

  const footer = doc.createElement("div");
  footer.className = "r-footer";
  footer.textContent = "(click to scroll to bibliography)";
  refWrap.appendChild(footer);

  content.appendChild(refWrap);
  tip.appendChild(content);
  return tip;
}
