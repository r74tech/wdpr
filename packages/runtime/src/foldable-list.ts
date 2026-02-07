/**
 *
 * Runtime module for foldable (collapsible) list menus.
 *
 * Wikidot's `foldable-list-container` feature adds fold/unfold toggle
 * controls to nested list items. This module sets up each list item that
 * has a nested `<ul>` or `<ol>` with a toggle anchor and the `folded`
 * class, then attaches click handlers to toggle between `folded` and
 * `unfolded` states.
 *
 * DOM interactions:
 * - Queries all `.foldable-list-container` elements on initialization
 * - For each `<li>` with nested lists, inserts a `.foldable-list-toggle` anchor
 *   and adds the `folded` CSS class
 * - Listens for `click` on each container to toggle `folded`/`unfolded`
 *   classes on the clicked `<li>`
 * - Real links (not `#` or `javascript:;`) are allowed to navigate normally
 *
 * The `destroy()` cleanup function removes all click listeners from containers.
 *
 * @module
 */

import type { ModuleCleanup } from "./types";
import { isElement } from "./utils/dom";

/**
 * Initialize foldable list behavior within the given root element.
 *
 * Scans for `.foldable-list-container` elements, sets up toggle anchors
 * on list items with nested lists, and attaches click handlers for
 * fold/unfold toggling.
 *
 * @param root - The root DOM element containing rendered Wikidot markup.
 * @returns A cleanup handle whose `destroy()` method removes all click listeners.
 */
export function initFoldableList(root: HTMLElement): ModuleCleanup {
  // Initialize: find nested lists and add fold controls
  const containers = root.querySelectorAll<HTMLElement>(".foldable-list-container");
  for (const container of containers) {
    setupFoldableList(container);
  }

  // Event listener is added to each .foldable-list-container
  // to match Wikidot's behavior (WIKIDOT.page.fixers.fixFoldableMenus)
  function handleContainerClick(e: Event): void {
    const target = e.target;
    if (!isElement(target)) return;

    // Wikidot behavior: if anchor with real href, don't handle
    if (
      target.tagName === "A" &&
      (target as HTMLAnchorElement).href !== "#" &&
      (target as HTMLAnchorElement).href !== "javascript:;"
    ) {
      // Allow real links to work normally
      // But check if it's a "#" href (browsers normalize to full URL)
      const href = target.getAttribute("href");
      if (href !== "#" && href !== "javascript:;") {
        return;
      }
    }

    e.preventDefault();

    // Wikidot behavior: walk up to find li.folded or li.unfolded
    let li: Element | null = target;
    while (li && li.tagName?.toLowerCase() !== "li") {
      li = li.parentElement;
    }

    if (!li) return;
    if (!li.classList.contains("folded") && !li.classList.contains("unfolded")) {
      return;
    }

    // Toggle folded/unfolded
    if (li.classList.contains("folded")) {
      li.classList.remove("folded");
      li.classList.add("unfolded");
    } else {
      li.classList.remove("unfolded");
      li.classList.add("folded");
    }
  }

  // Add click listener to each container (matches Wikidot's approach)
  for (const container of containers) {
    container.addEventListener("click", handleContainerClick);
  }

  return {
    destroy() {
      for (const container of containers) {
        container.removeEventListener("click", handleContainerClick);
      }
    },
  };
}

/**
 * Set up fold controls on a single foldable list container.
 *
 * For each `<li>` that has a direct child `<ul>` or `<ol>`, inserts a
 * `.foldable-list-toggle` anchor as the first child and applies the
 * `folded` CSS class. Already-initialized items are skipped.
 *
 * @param container - The `.foldable-list-container` element to set up.
 */
function setupFoldableList(container: HTMLElement): void {
  const items = container.querySelectorAll<HTMLElement>("li");
  for (const item of items) {
    const nestedList = item.querySelector(":scope > ul, :scope > ol");
    if (!nestedList) continue;

    // Only add toggle if not already set up
    if (item.querySelector(".foldable-list-toggle")) continue;

    item.classList.add("folded");

    const toggle = container.ownerDocument.createElement("a");
    toggle.className = "foldable-list-toggle";
    toggle.href = "javascript:;";
    item.insertBefore(toggle, item.firstChild);
  }
}
