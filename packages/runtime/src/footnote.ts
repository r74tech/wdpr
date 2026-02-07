/**
 * @module footnote
 *
 * Runtime module for footnote hover tooltips and bidirectional scroll navigation.
 *
 * Sets up three types of DOM interactions:
 *
 * 1. Click on `a.footnoteref` -- scrolls to the corresponding footnote body
 * 2. Click on a link inside `.footnote-footer` -- scrolls back to the reference
 * 3. Hover on `a.footnoteref` -- shows a Wikidot-compatible tooltip with the
 *    footnote content
 *
 * Tooltips are pre-built during initialization and appended to a dedicated
 * `#odialog-hovertips` container element. Positioning is calculated
 * dynamically on each hover to account for scroll position.
 *
 * DOM interactions:
 * - Listens for `click` (bubble) for footnote ref/body navigation
 * - Listens for `mouseenter` (capture) on `a.footnoteref` to show tooltip
 * - Listens for `mouseleave` (capture) on `a.footnoteref` to hide tooltip
 * - Creates `#odialog-hovertips` container appended to `document.body`
 *
 * The `destroy()` cleanup function removes all event listeners and the
 * tooltip container element.
 */

import type { ModuleCleanup } from "./types";
import { isElement } from "./utils/dom";
import { scrollToElement } from "./utils/scroll";

/**
 * Initialize footnote interaction behavior within the given root element.
 *
 * Pre-builds tooltips for all footnote references, attaches click handlers
 * for bidirectional scrolling between references and bodies, and attaches
 * hover handlers for tooltip display.
 *
 * @param root - The root DOM element containing rendered Wikidot markup.
 * @returns A cleanup handle whose `destroy()` method removes all listeners
 *   and the tooltip container.
 */
export function initFootnote(root: HTMLElement): ModuleCleanup {
  const doc = root.ownerDocument;

  // Create hovertip container
  const container = doc.createElement("div");
  container.id = "odialog-hovertips";
  container.style.position = "absolute";
  container.style.zIndex = "100";
  container.style.top = "0";
  container.style.width = "100%";
  doc.body.appendChild(container);

  // Pre-build tooltips for all footnote refs
  const tooltipMap = new Map<string, HTMLElement>();
  const frefs = root.querySelectorAll<HTMLAnchorElement>("a.footnoteref");
  for (const fref of frefs) {
    const id = getFootnoteId(fref);
    if (!id) continue;
    const footnote = doc.getElementById(id);
    if (!footnote) continue;

    // Use link text (always the clean number) for tooltip label
    const numId = fref.textContent?.trim() ?? id.replace(/^footnote-/, "");
    const tip = buildFootnoteTooltip(doc, footnote, numId);
    container.appendChild(tip);
    tooltipMap.set(fref.id, tip);
  }

  function handleClick(e: Event): void {
    const target = e.target;
    if (!isElement(target)) return;
    const link = target.closest<HTMLAnchorElement>("a");
    if (!link) return;

    if (link.classList.contains("footnoteref")) {
      e.preventDefault();
      const id = getFootnoteId(link);
      if (id) scrollToElement(id, doc);
      return;
    }

    const footnoteItem = link.closest<HTMLElement>(".footnote-footer");
    if (footnoteItem) {
      const backrefId = getBackrefId(link, footnoteItem);
      if (backrefId) {
        e.preventDefault();
        scrollToElement(backrefId, doc);
      }
    }
  }

  function handleMouseEnter(e: Event): void {
    const target = e.target;
    if (!isElement(target)) return;
    const link = target.closest<HTMLAnchorElement>("a.footnoteref");
    if (!link) return;

    const tip = tooltipMap.get(link.id);
    if (!tip) return;

    positionTooltip(tip, link);
    tip.style.display = "block";
  }

  function handleMouseLeave(e: Event): void {
    const target = e.target;
    if (!isElement(target)) return;
    if (target.closest("a.footnoteref")) {
      for (const tip of tooltipMap.values()) {
        tip.style.display = "none";
      }
    }
  }

  root.addEventListener("click", handleClick);
  root.addEventListener("mouseenter", handleMouseEnter, true);
  root.addEventListener("mouseleave", handleMouseLeave, true);

  return {
    destroy() {
      root.removeEventListener("click", handleClick);
      root.removeEventListener("mouseenter", handleMouseEnter, true);
      root.removeEventListener("mouseleave", handleMouseLeave, true);
      container.remove();
    },
  };
}

/**
 * Position a tooltip element below (or above) the given anchor element.
 *
 * The tooltip is briefly shown to measure its dimensions, then repositioned
 * to stay within the viewport boundaries.
 *
 * @param tip - The tooltip element to position.
 * @param anchor - The anchor element the tooltip is attached to.
 */
function positionTooltip(tip: HTMLElement, anchor: HTMLElement): void {
  const doc = anchor.ownerDocument;
  const win = doc.defaultView ?? window;
  const anchorRect = anchor.getBoundingClientRect();

  let left = anchorRect.left + win.scrollX;
  let top = anchorRect.bottom + win.scrollY + 4;

  // Need to briefly show to measure
  tip.style.display = "block";
  const tipRect = tip.getBoundingClientRect();
  tip.style.display = "none";

  if (left + tipRect.width > win.innerWidth + win.scrollX) {
    left = win.innerWidth + win.scrollX - tipRect.width - 8;
  }
  if (top + tipRect.height > win.innerHeight + win.scrollY) {
    top = anchorRect.top + win.scrollY - tipRect.height - 4;
  }

  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

/**
 * Build a Wikidot-compatible footnote tooltip element.
 *
 * Structure: `.hovertip > .content > .footnote > .f-heading + .f-content + .f-footer`
 *
 * The tooltip clones the footnote body, strips the leading link and
 * numbering (e.g., `<a>1</a>. `), and wraps the remaining content in
 * the standard tooltip structure.
 *
 * @param doc - The owner document for DOM element creation.
 * @param footnoteEl - The `.footnote-footer` element to extract content from.
 * @param id - The footnote number (for the heading text).
 * @returns A detached tooltip DOM element, initially hidden.
 */
function buildFootnoteTooltip(doc: Document, footnoteEl: HTMLElement, id: string): HTMLElement {
  const tip = doc.createElement("div");
  tip.className = "hovertip";
  tip.style.width = "auto";
  tip.style.backgroundColor = "white";
  tip.style.position = "absolute";
  tip.style.display = "none";
  tip.style.border = "1px solid black";

  const content = doc.createElement("div");
  content.className = "content";

  const footnoteWrap = doc.createElement("div");
  footnoteWrap.className = "footnote";

  const heading = doc.createElement("div");
  heading.className = "f-heading";
  heading.textContent = `Footnote ${id}.`;
  footnoteWrap.appendChild(heading);

  const fContent = doc.createElement("div");
  fContent.className = "f-content";
  const clone = footnoteEl.cloneNode(true) as HTMLElement;
  const firstLink = clone.querySelector("a");
  if (firstLink) {
    const next = firstLink.nextSibling;
    if (next?.nodeType === Node.TEXT_NODE && next.textContent?.startsWith(". ")) {
      next.textContent = next.textContent.slice(2);
    }
    firstLink.remove();
  }
  while (clone.firstChild) fContent.appendChild(clone.firstChild);
  footnoteWrap.appendChild(fContent);

  const footer = doc.createElement("div");
  footer.className = "f-footer";
  footer.textContent = "(click to scroll to footnotes)";
  footnoteWrap.appendChild(footer);

  content.appendChild(footnoteWrap);
  tip.appendChild(content);
  return tip;
}

/**
 * Extract the footnote body element ID from a footnote reference link.
 *
 * Checks the `href` attribute first (e.g., `#footnote-1`), then falls back
 * to deriving the ID from the link's own `id` attribute.
 *
 * @param link - The `a.footnoteref` anchor element.
 * @returns The footnote body element ID, or `null` if it cannot be determined.
 */
function getFootnoteId(link: HTMLAnchorElement): string | null {
  const href = link.getAttribute("href");
  if (href?.startsWith("#")) return href.slice(1);
  const id = link.id;
  if (id.startsWith("footnoteref-")) {
    return `footnote-${id.slice("footnoteref-".length)}`;
  }
  return null;
}

/**
 * Extract the back-reference element ID from a footnote body link.
 *
 * Used for "scroll back to reference" behavior. Derives the `footnoteref-N`
 * ID from the footnote footer's own `footnote-N` ID.
 *
 * @param link - The anchor element clicked within the footnote body.
 * @param footer - The `.footnote-footer` container element.
 * @returns The footnote reference element ID, or `null` if it cannot be determined.
 */
function getBackrefId(link: HTMLAnchorElement, footer: HTMLElement): string | null {
  const href = link.getAttribute("href");
  if (href?.startsWith("#")) return href.slice(1);
  if (footer.id.startsWith("footnote-")) {
    const num = footer.id.slice("footnote-".length);
    return `footnoteref-${num}`;
  }
  return null;
}
