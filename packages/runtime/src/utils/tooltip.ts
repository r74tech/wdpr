let activeTooltip: HTMLElement | null = null;

/** Show a pre-built tooltip element near the given anchor */
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

/** Show a tooltip near the given anchor element, cloning content from source into .hovertip > .content */
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

/** Hide the currently active tooltip */
export function hideTooltip(): void {
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}
