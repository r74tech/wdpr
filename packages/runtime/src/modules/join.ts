import type { ModuleCleanup, RuntimeOptions } from "../types";
import { isElement } from "../utils/dom";

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
