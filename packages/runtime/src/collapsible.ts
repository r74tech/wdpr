import type { ModuleCleanup, RuntimeOptions } from "./types";
import { isElement } from "./utils/dom";

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
