import type { ModuleCleanup } from "./types";
import { isElement } from "./utils/dom";
import { scrollToElement } from "./utils/scroll";

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

    const numId = id.replace(/^footnote-/, "");
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

/** Build Wikidot-compatible hovertip: .hovertip > .content > .footnote > .f-heading + .f-content + .f-footer */
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

function getFootnoteId(link: HTMLAnchorElement): string | null {
  const href = link.getAttribute("href");
  if (href?.startsWith("#")) return href.slice(1);
  const id = link.id;
  if (id.startsWith("footnoteref-")) {
    return `footnote-${id.slice("footnoteref-".length)}`;
  }
  return null;
}

function getBackrefId(link: HTMLAnchorElement, footer: HTMLElement): string | null {
  const href = link.getAttribute("href");
  if (href?.startsWith("#")) return href.slice(1);
  if (footer.id.startsWith("footnote-")) {
    const num = footer.id.slice("footnote-".length);
    return `footnoteref-${num}`;
  }
  return null;
}
