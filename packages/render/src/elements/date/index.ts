/**
 *
 * Renderer for Wikidot's date/time elements.
 *
 * Wikidot stores dates as Unix timestamps and optionally provides a
 * `strftime`-style format string. The renderer formats the date
 * server-side; when the `hover` flag is set, the output is wrapped in
 * `<span class="odate">` so that the runtime `odate` module can
 * reformat it to the user's local timezone on the client.
 *
 * @module
 */

import type { DateData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { formatDate } from "./format";
import { renderDateOutput } from "./output";

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
  ctx.push(renderDateOutput(formatted, data.hover));
}
