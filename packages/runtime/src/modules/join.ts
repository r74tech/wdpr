/**
 *
 * Runtime module for the Wikidot `[[module Join]]` button.
 *
 * The Join module renders a `.join-btn` element that, when clicked,
 * invokes the host application's join callback (`options.onJoin`).
 * If no callback is provided, clicks are silently ignored.
 *
 * DOM interactions:
 * - Listens for `click` (bubble) on root, delegated to `.join-btn`
 * - Calls `options.onJoin()` (which returns a Promise) on click
 *
 * The `destroy()` cleanup function removes the click listener.
 *
 * @module
 */

import type { ModuleCleanup, RuntimeOptions } from "../types";
import { isElement } from "../utils/dom";

/**
 * Initialize the Join module button handler within root.
 *
 * Delegates click events to `.join-btn` elements. When clicked, the
 * `onJoin` callback from the runtime options is invoked. If no `onJoin`
 * callback is provided, the handler is a no-op.
 *
 * @param root - The root DOM element containing rendered Wikidot markup.
 * @param options - Runtime options containing the optional `onJoin` callback.
 * @returns A cleanup handle whose `destroy()` method removes the click listener.
 */
export function initJoin(root: HTMLElement, options?: RuntimeOptions): ModuleCleanup {
  const onJoin = options?.onJoin;

  function handleClick(e: Event): void {
    if (!onJoin) return;

    const target = e.target;
    if (!isElement(target)) return;
    const btn = target.closest<HTMLElement>(".join-btn");
    if (!btn) return;

    e.preventDefault();
    void onJoin();
  }

  root.addEventListener("click", handleClick);

  return {
    destroy() {
      root.removeEventListener("click", handleClick);
    },
  };
}
