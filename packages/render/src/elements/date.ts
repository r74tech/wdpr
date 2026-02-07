/**
 * @module elements/date
 *
 * Renderer for Wikidot's date/time elements.
 *
 * Wikidot stores dates as Unix timestamps and optionally provides a
 * `strftime`-style format string. The renderer formats the date
 * server-side; when the `hover` flag is set, the output is wrapped in
 * `<span class="odate">` so that the runtime `odate` module can
 * reformat it to the user's local timezone on the client.
 */

import type { DateData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeHtml } from "../escape";

/**
 * Render a date element, optionally wrapping in an `odate` span for
 * client-side timezone conversion.
 *
 * When `data.format` is provided, the date is formatted using a subset
 * of `strftime` specifiers (`%Y`, `%m`, `%d`, `%H`, `%M`, `%S`).
 * Otherwise, `Date.toLocaleString()` is used as a fallback.
 *
 * @param ctx - The current render context.
 * @param data - Date element data with timestamp, optional format, and hover flag.
 */
export function renderDate(ctx: RenderContext, data: DateData): void {
  const date = new Date(data.value.timestamp * 1000);
  const formatted = data.format ? formatDate(date, data.format) : date.toLocaleString();

  if (data.hover) {
    ctx.push(`<span class="odate">${escapeHtml(formatted)}</span>`);
  } else {
    ctx.push(escapeHtml(formatted));
  }
}

/**
 * Format a `Date` using a subset of `strftime` specifiers.
 *
 * Supported specifiers: `%Y` (4-digit year), `%m` (zero-padded month),
 * `%d` (zero-padded day), `%H` (zero-padded hours), `%M` (zero-padded
 * minutes), `%S` (zero-padded seconds).
 *
 * @param date - The date to format.
 * @param format - A strftime-compatible format string.
 * @returns The formatted date string.
 */
function formatDate(date: Date, format: string): string {
  return format
    .replace(/%Y/g, String(date.getFullYear()))
    .replace(/%m/g, String(date.getMonth() + 1).padStart(2, "0"))
    .replace(/%d/g, String(date.getDate()).padStart(2, "0"))
    .replace(/%H/g, String(date.getHours()).padStart(2, "0"))
    .replace(/%M/g, String(date.getMinutes()).padStart(2, "0"))
    .replace(/%S/g, String(date.getSeconds()).padStart(2, "0"));
}
