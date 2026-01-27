import type { ModuleCleanup } from "./types";
import { isElement } from "./utils/dom";
import { hideTooltip, showTooltipEl } from "./utils/tooltip";

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

/** Build Wikidot-compatible hovertip: .hovertip > .content > .reference > .r-heading + .r-content + .r-footer */
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
