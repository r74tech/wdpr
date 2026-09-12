import type { ModuleCleanup, RuntimeOptions } from "./types";
import { isElement } from "./utils/dom";

/** Dispatch page-option requests to the host; this module never edits page data. */
export function initPageButtons(root: HTMLElement, options?: RuntimeOptions): ModuleCleanup {
  function click(event: Event): void {
    if (!isElement(event.target)) return;
    const anchor = event.target.closest<HTMLAnchorElement>("a[data-wdpr-page-action]");
    if (!anchor || !root.contains(anchor)) return;
    event.preventDefault();
    const action = anchor.getAttribute("data-wdpr-page-action");
    if (action) void options?.onPageAction?.(action);
  }
  root.addEventListener("click", click);
  return {
    destroy() {
      root.removeEventListener("click", click);
    },
  };
}
