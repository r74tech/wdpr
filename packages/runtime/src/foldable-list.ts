import type { ModuleCleanup } from "./types";
import { isElement } from "./utils/dom";

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
