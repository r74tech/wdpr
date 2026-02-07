/**
 *
 * Runtime module for the Wikidot `[[module Rate]]` page rating widget.
 *
 * The Rate module renders a `.page-rate-widget-box` containing up-vote,
 * down-vote, and cancel buttons. This module delegates click events to
 * those buttons and invokes the host application's `onRate` callback
 * with the page ID and point value (+1, -1, or 0 for cancel).
 *
 * When the callback resolves, the widget's displayed score and vote
 * count are updated in place via `updateRateDisplay()`.
 *
 * DOM interactions:
 * - Listens for `click` (bubble) on root, delegated to `.btn`, `.rateup`,
 *   `.ratedown`, and `.cancel` elements inside `.page-rate-widget-box`
 * - Updates `.rate-points .number` and `.vote-count` text content on success
 *
 * The `destroy()` cleanup function removes the click listener.
 *
 * @module
 */

import type { ModuleCleanup, RuntimeOptions } from "../types";
import { isElement } from "../utils/dom";

/**
 * Initialize the Rate module widget handler within root.
 *
 * Delegates click events to rating buttons (up, down, cancel) inside
 * `.page-rate-widget-box`. Each click invokes the `onRate` callback
 * from the runtime options with the page ID (from `data-page-id`) and
 * the point delta. The widget display is updated when the callback resolves.
 *
 * If no `onRate` callback is provided, the handler is a no-op.
 *
 * @param root - The root DOM element containing rendered Wikidot markup.
 * @param options - Runtime options containing the optional `onRate` callback.
 * @returns A cleanup handle whose `destroy()` method removes the click listener.
 */
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

/**
 * Update the displayed score and vote count on a rate widget after a
 * successful rating action.
 *
 * Finds `.rate-points .number` to display the total points (with a `+`
 * prefix for positive values) and `.vote-count` for the total number
 * of votes.
 *
 * @param widget - The `.page-rate-widget-box` container element.
 * @param points - The new total point score to display.
 * @param votes - The new total vote count to display.
 */
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
