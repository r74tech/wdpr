import type { CollapsibleData } from "@wdprlib/ast";
import { escapeHtml } from "../../escape";

export interface CollapsibleLabels {
  show: string;
  hide: string;
}

export function getCollapsibleLabels(data: CollapsibleData): CollapsibleLabels {
  return {
    show: data["show-text"] ? formatLabelText(data["show-text"]) : formatCollapsibleText("+", "show block"),
    hide: data["hide-text"] ? formatLabelText(data["hide-text"]) : formatCollapsibleText("\u2013", "hide block"),
  };
}

/**
 * Format a default collapsible link label by prepending a prefix symbol
 * (e.g. "+" or en-dash) with `&nbsp;` encoding for spaces.
 */
function formatCollapsibleText(prefix: string, text: string): string {
  const encoded = escapeHtml(text).replace(/ /g, "&nbsp;");
  return `${prefix}&nbsp;${encoded}`;
}

/**
 * Format a custom collapsible link label by escaping HTML and
 * replacing spaces with `&nbsp;` (matching Wikidot behavior).
 */
function formatLabelText(text: string): string {
  return escapeHtml(text).replace(/ /g, "&nbsp;");
}
