import type { ModuleCleanup } from "./types";
import { isElement } from "./utils/dom";

export function initToc(root: HTMLElement): ModuleCleanup {
  function handleClick(e: Event): void {
    const target = e.target;
    if (!isElement(target)) return;
    const link = target.closest("a");
    if (!link) return;

    const actionBar = link.closest<HTMLElement>("#toc-action-bar");
    if (!actionBar) return;

    e.preventDefault();

    const toc = actionBar.closest<HTMLElement>("#toc");
    if (!toc) return;

    const tocList = toc.querySelector<HTMLElement>("#toc-list");
    if (!tocList) return;

    const links = Array.from(actionBar.querySelectorAll<HTMLElement>("a"));
    const foldLink = links[0];
    const unfoldLink = links[1];
    if (!foldLink || !unfoldLink) return;

    const isVisible = tocList.style.display !== "none";

    if (isVisible) {
      tocList.style.display = "none";
      foldLink.style.display = "none";
      unfoldLink.style.display = "";
    } else {
      tocList.style.display = "";
      foldLink.style.display = "";
      unfoldLink.style.display = "none";
    }
  }

  root.addEventListener("click", handleClick);

  return {
    destroy() {
      root.removeEventListener("click", handleClick);
    },
  };
}
