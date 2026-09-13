import type { RatingState } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { escapeAttr, escapeHtml } from "../../escape";

export function getRateWidgetParts(ctx: RenderContext, state: RatingState): string[] {
  const labels = {
    up: ctx.messages.text({ id: "rate.up", defaultMessage: "I like it" }),
    down: ctx.messages.text({ id: "rate.down", defaultMessage: "I don't like it" }),
    neutral: ctx.messages.text({ id: "rate.neutral", defaultMessage: "Neutral vote" }),
    cancel: ctx.messages.text({ id: "rate.cancel", defaultMessage: "Cancel my vote" }),
    error: ctx.messages.text({
      id: "rate.error",
      defaultMessage: "Unable to save your vote. Try again.",
    }),
  };
  const ref = state.ref;
  const parts = [
    `<div class="page-rate-widget-box" data-rating-kind="${ref.kind}"${ref.kind === "custom" ? ` data-rating-axis="${escapeAttr(ref.axisKey)}"` : ""}${Object.entries(
      labels,
    )
      .map(([key, value]) => ` data-rating-${key}-label="${escapeAttr(value)}"`)
      .join("")} tabindex="-1">`,
    `<span class="rate-points" aria-live="polite">${escapeHtml(state.label)}${state.aggregate ? `:&nbsp;<span class="number prw54353">${state.aggregate.points > 0 ? "+" : ""}${state.aggregate.points}</span>` : ""}</span>`,
  ];
  for (const value of [1, 0, -1] as const) {
    if (!state.allowedVotes.includes(value)) continue;
    const [className, glyph, label] =
      value === 1
        ? ["rateup", "+", labels.up]
        : value === 0
          ? ["rateup rateneutral", "Ø", labels.neutral]
          : ["ratedown", "–", labels.down];
    parts.push(
      `<span class="${className} btn btn-default"><a href="#" role="button" data-rating-action="${value}" title="${escapeAttr(label)}" aria-label="${escapeAttr(label)}" aria-pressed="${state.currentVote === value}" aria-disabled="${!state.canVote}" tabindex="${state.canVote ? 0 : -1}">${escapeHtml(state.voteLabels?.[value] ?? glyph)}</a></span>`,
    );
  }
  if (state.canCancel) {
    parts.push(
      `<span class="cancel btn btn-default"><a href="#" role="button" data-rating-action="cancel" title="${escapeAttr(labels.cancel)}" aria-label="${escapeAttr(labels.cancel)}" aria-disabled="${state.currentVote === null}" tabindex="${state.currentVote === null ? -1 : 0}">×</a></span>`,
    );
  }
  parts.push('<span class="rate-status" role="status"></span></div>');
  return parts;
}
