import type { ModuleCleanup } from "./types";
import { isElement } from "./utils/dom";

export function initTabview(root: HTMLElement): ModuleCleanup {
  function handleClick(e: Event): void {
    const target = e.target;
    if (!isElement(target)) return;
    const navItem = target.closest<HTMLElement>(".yui-navset .yui-nav li");
    if (!navItem) return;

    const navset = navItem.closest<HTMLElement>(".yui-navset");
    if (!navset) return;

    e.preventDefault();

    const nav = navset.querySelector<HTMLElement>(".yui-nav");
    const content = navset.querySelector<HTMLElement>(".yui-content");
    if (!nav || !content) return;

    const navItems = Array.from(nav.querySelectorAll<HTMLElement>(":scope > li"));
    const contentDivs = Array.from(content.querySelectorAll<HTMLElement>(":scope > div"));

    const index = navItems.indexOf(navItem);
    if (index === -1) return;

    // Update nav selected state
    for (const item of navItems) {
      item.classList.remove("selected");
    }
    navItem.classList.add("selected");

    // Update content visibility
    for (let i = 0; i < contentDivs.length; i++) {
      const div = contentDivs[i];
      if (div) {
        div.style.display = i === index ? "" : "none";
      }
    }
  }

  root.addEventListener("click", handleClick);

  return {
    destroy() {
      root.removeEventListener("click", handleClick);
    },
  };
}
