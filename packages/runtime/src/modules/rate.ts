import type { ModuleCleanup, RuntimeOptions } from "../types";
import { isElement } from "../utils/dom";

export function initRate(root: HTMLElement, options?: RuntimeOptions): ModuleCleanup {
  const onRate = options?.onRate;

  function handleClick(e: Event): void {
    if (!onRate) return;

    const target = e.target;
    if (!isElement(target)) return;
    const btn = target.closest<HTMLElement>(".btn, .rateup, .ratedown, .cancel");
    if (!btn) return;

    const widget = btn.closest<HTMLElement>(".page-rate-widget-box");
    if (!widget) return;

    e.preventDefault();

    const pageId = widget.dataset["pageId"] ?? "";
    let points = 0;

    if (btn.classList.contains("rateup") || btn.classList.contains("btn-rate-up")) {
      points = 1;
    } else if (btn.classList.contains("ratedown") || btn.classList.contains("btn-rate-down")) {
      points = -1;
    } else if (btn.classList.contains("cancel") || btn.classList.contains("btn-cancel")) {
      points = 0;
    }

    void onRate(pageId, points).then((result) => {
      updateRateDisplay(widget, result.points, result.votes);
    });
  }

  root.addEventListener("click", handleClick);

  return {
    destroy() {
      root.removeEventListener("click", handleClick);
    },
  };
}

function updateRateDisplay(widget: HTMLElement, points: number, votes: number): void {
  const rateNum = widget.querySelector<HTMLElement>(".rate-points .number");
  if (rateNum) {
    const prefix = points > 0 ? "+" : "";
    rateNum.textContent = `${prefix}${points}`;
  }

  const voteCount = widget.querySelector<HTMLElement>(".vote-count");
  if (voteCount) {
    voteCount.textContent = String(votes);
  }
}
