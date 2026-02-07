/**
 * @module utils/tooltip
 *
 * Shared tooltip positioning and lifecycle utilities.
 *
 * Provides a single-active-tooltip model: only one tooltip can be
 * visible at a time. Showing a new tooltip automatically hides the
 * previous one. Tooltips are appended to `document.body` and
 * positioned absolutely relative to an anchor element.
 *
 * Two creation modes are available:
 * - {@link showTooltipEl} -- positions and shows a pre-built tooltip element
 * - {@link showTooltip} -- builds a Wikidot-compatible `.hovertip > .content`
 *   wrapper from a source element's children (cloned to prevent XSS)
 *
 * {@link hideTooltip} removes the currently active tooltip from the DOM.
 */

/** The currently visible tooltip element, or `null` if none is active. */
let activeTooltip: HTMLElement | null = null;

/**
 * Position and show a pre-built tooltip element near the given anchor.
 *
 * The tooltip is appended to `document.body` with absolute positioning.
 * It is placed below the anchor by default, but flips above if there
 * is not enough viewport space below. Horizontal position is clamped
 * to keep the tooltip within the viewport.
 *
 * Any previously active tooltip is hidden first.
 *
 * @param anchor - The element the tooltip is anchored to.
 * @param tip - The tooltip element to show (will be mutated in place).
 */
export function showTooltipEl(anchor: HTMLElement, tip: HTMLElement): void {
  hideTooltip();

  const doc = anchor.ownerDocument;

  tip.style.position = "absolute";
  tip.style.zIndex = "10000";
  doc.body.appendChild(tip);

  const anchorRect = anchor.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  const win = doc.defaultView ?? window;

  let left = anchorRect.left + win.scrollX;
  let top = anchorRect.bottom + win.scrollY + 4;

  // Keep within viewport
  if (left + tipRect.width > win.innerWidth + win.scrollX) {
    left = win.innerWidth + win.scrollX - tipRect.width - 8;
  }
  if (top + tipRect.height > win.innerHeight + win.scrollY) {
    top = anchorRect.top + win.scrollY - tipRect.height - 4;
  }

  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
  activeTooltip = tip;
}

/**
 * Build and show a Wikidot-compatible tooltip near the given anchor.
 *
 * Creates a `.hovertip > .content` wrapper element, clones the children
 * of the source element into it (using `cloneNode` rather than
 * `innerHTML` to prevent XSS), and delegates to {@link showTooltipEl}
 * for positioning and display.
 *
 * @param anchor - The element the tooltip is anchored to.
 * @param source - The element whose children are cloned into the tooltip.
 */
export function showTooltip(anchor: HTMLElement, source: HTMLElement): void {
  const doc = anchor.ownerDocument;
  const tip = doc.createElement("div");
  tip.className = "hovertip";
  tip.style.width = "auto";
  tip.style.backgroundColor = "white";

  const content = doc.createElement("div");
  content.className = "content";

  // Clone content instead of using innerHTML to avoid XSS
  const clone = source.cloneNode(true) as HTMLElement;
  while (clone.firstChild) {
    content.appendChild(clone.firstChild);
  }

  tip.appendChild(content);
  showTooltipEl(anchor, tip);
}

/**
 * Hide and remove the currently active tooltip from the DOM.
 *
 * If no tooltip is active, this is a no-op. After removal, the
 * internal reference is cleared so that subsequent calls are safe.
 */
export function hideTooltip(): void {
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}
