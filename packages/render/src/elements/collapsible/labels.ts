import type { CollapsibleData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { escapeHtml } from "../../escape";

export interface CollapsibleLabels {
  show: string;
  hide: string;
}

export function getCollapsibleLabels(ctx: RenderContext, data: CollapsibleData): CollapsibleLabels {
  return {
    show: data["show-text"]
      ? formatLabelText(data["show-text"])
      : formatLabelText(
          ctx.messages.text({ id: "collapsible.show", defaultMessage: "+ show block" }),
        ),
    hide: data["hide-text"]
      ? formatLabelText(data["hide-text"])
      : formatLabelText(
          ctx.messages.text({ id: "collapsible.hide", defaultMessage: "– hide block" }),
        ),
  };
}

/**
 * Format a custom collapsible link label by escaping HTML and
 * replacing spaces with `&nbsp;` (matching Wikidot behavior).
 */
function formatLabelText(text: string): string {
  return escapeHtml(text).replace(/ /g, "&nbsp;");
}
