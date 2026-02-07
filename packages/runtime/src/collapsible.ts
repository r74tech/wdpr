/**
 *
 * Runtime module for `[[collapsible]]` block toggle behavior.
 *
 * Sets up a delegated `click` event listener on the root element to detect
 * clicks on `a.collapsible-block-link` elements. Clicking toggles between
 * the folded and unfolded states by manipulating `display` styles on the
 * `.collapsible-block-folded` and `.collapsible-block-unfolded` containers.
 *
 * When the `fade` option is enabled (default), opening a collapsible block
 * triggers a 200ms CSS opacity fade-in animation on the content.
 *
 * DOM interactions:
 * - Listens for `click` on `a.collapsible-block-link` within `.collapsible-block`
 * - Toggles `display` between `"block"` and `"none"` on folded/unfolded divs
 * - Optionally applies a fade-in transition on `.collapsible-block-content`
 *
 * The `destroy()` cleanup function removes the click listener.
 *
 * @module
 */

import type { ModuleCleanup, RuntimeOptions } from "./types";
import { isElement } from "./utils/dom";

/**
 * Initialize collapsible block toggle behavior within the given root element.
 *
 * @param root - The root DOM element containing rendered Wikidot markup.
 * @param options - Optional runtime options; `fade` (default `true`) controls
 *   whether the content fades in when the block is expanded.
 * @returns A cleanup handle whose `destroy()` method removes the click listener.
 */
export function initCollapsible(root: HTMLElement, options?: RuntimeOptions): ModuleCleanup {
  const useFade = options?.fade !== false;

  function handleClick(e: Event): void {
    const target = e.target;
    if (!isElement(target)) return;
    const link = target.closest<HTMLElement>("a.collapsible-block-link");
    if (!link) return;

    const block = link.closest<HTMLElement>(".collapsible-block");
    if (!block) return;

    e.preventDefault();

    const folded = block.querySelector<HTMLElement>(".collapsible-block-folded");
    const unfolded = block.querySelector<HTMLElement>(".collapsible-block-unfolded");
    if (!folded || !unfolded) return;

    const isFolded = folded.style.display !== "none";

    if (isFolded) {
      folded.style.display = "none";
      unfolded.style.display = "block";
      if (useFade) {
        const content = unfolded.querySelector<HTMLElement>(".collapsible-block-content");
        if (content) fadeIn(content);
      }
    } else {
      folded.style.display = "block";
      unfolded.style.display = "none";
    }
  }

  root.addEventListener("click", handleClick);

  return {
    destroy() {
      root.removeEventListener("click", handleClick);
    },
  };
}

/**
 * Apply a CSS opacity fade-in animation to an element.
 *
 * Sets opacity to 0, applies a 200ms ease-in transition, forces a reflow,
 * then sets opacity to 1. The transition styles are cleaned up on completion.
 *
 * @param el - The element to animate.
 */
function fadeIn(el: HTMLElement): void {
  el.style.opacity = "0";
  el.style.transition = "opacity 200ms ease-in";
  // Force reflow
  void el.offsetHeight;
  el.style.opacity = "1";
  const onEnd = (): void => {
    el.style.transition = "";
    el.style.opacity = "";
    el.removeEventListener("transitionend", onEnd);
  };
  el.addEventListener("transitionend", onEnd);
}
