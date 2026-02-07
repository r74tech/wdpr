/**
 *
 * Runtime module for Wikidot's `[[tabview]]` / `[[tab]]` tab switching.
 *
 * The server renders tabs using Yahoo UI (YUI) CSS class conventions:
 * - `.yui-navset` wraps the entire tab component
 * - `.yui-nav > li` items form the tab bar (the `selected` class marks the active tab)
 * - `.yui-content > div` children hold each tab's content panel
 *
 * This module uses event delegation on the root element to listen for
 * clicks on any `.yui-nav li` and toggles the `selected` class and
 * content panel visibility by matching the clicked tab's index to the
 * corresponding content `<div>`.
 *
 * DOM interactions:
 * - Listens for `click` (bubble) on root, delegated to `.yui-navset .yui-nav li`
 * - Toggles `.selected` class on nav items
 * - Shows/hides content divs via `style.display`
 *
 * The `destroy()` cleanup function removes the click listener.
 *
 * @module
 */

import type { ModuleCleanup } from "./types";
import { isElement } from "./utils/dom";

/**
 * Initialize tab switching behavior for all `[[tabview]]` blocks within root.
 *
 * Attaches a single delegated click listener that handles tab selection
 * for every `.yui-navset` inside the root element.
 *
 * @param root - The root DOM element containing rendered Wikidot markup.
 * @returns A cleanup handle whose `destroy()` method removes the click listener.
 */
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
