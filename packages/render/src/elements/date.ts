import type { DateData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeHtml } from "../escape";

/** Render date element */
export function renderDate(ctx: RenderContext, data: DateData): void {
  const date = new Date(data.value.timestamp * 1000);
  const formatted = data.format ? formatDate(date, data.format) : date.toLocaleString();

  if (data.hover) {
    ctx.push(`<span class="odate">${escapeHtml(formatted)}</span>`);
  } else {
    ctx.push(escapeHtml(formatted));
  }
}

function formatDate(date: Date, format: string): string {
  return format
    .replace(/%Y/g, String(date.getFullYear()))
    .replace(/%m/g, String(date.getMonth() + 1).padStart(2, "0"))
    .replace(/%d/g, String(date.getDate()).padStart(2, "0"))
    .replace(/%H/g, String(date.getHours()).padStart(2, "0"))
    .replace(/%M/g, String(date.getMinutes()).padStart(2, "0"))
    .replace(/%S/g, String(date.getSeconds()).padStart(2, "0"));
}
