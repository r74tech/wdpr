/**
 * @module toc
 *
 * Runtime module for the table-of-contents fold/unfold toggle.
 *
 * Wikidot's `[[toc]]` block renders a `#toc` container with a
 * `#toc-action-bar` containing two links: one to fold (hide) the
 * list and one to unfold (show) it. The actual heading list lives
 * in `#toc-list`.
 *
 * This module delegates click events from the root element to links
 * inside `#toc-action-bar`. When the list is visible, clicking folds
 * it (hides `#toc-list`, hides the fold link, shows the unfold link).
 * When folded, clicking unfolds it (the reverse).
 *
 * DOM interactions:
 * - Listens for `click` (bubble) on root, delegated to `a` inside `#toc-action-bar`
 * - Toggles `style.display` on `#toc-list` and the two action links
 *
 * The `destroy()` cleanup function removes the click listener.
 */

import type { ModuleCleanup } from "./types";
import { isElement } from "./utils/dom";

/**
 * Initialize the table-of-contents fold/unfold toggle within root.
 *
 * Attaches a single delegated click listener that handles the fold and
 * unfold links inside the `#toc-action-bar`.
 *
 * @param root - The root DOM element containing rendered Wikidot markup.
 * @returns A cleanup handle whose `destroy()` method removes the click listener.
 */
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
