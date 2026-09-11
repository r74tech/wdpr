import type { DateData } from "@wdprlib/ast";
import { escapeHtml } from "../../escape";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function renderDateOutput(data: DateData): string {
  const date = new Date(data.value.timestamp * 1000);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const label = `${pad(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
  let format = data.format || null;
  if (data.hover && !format?.split("|").slice(1).includes("agohover"))
    format = `${format ?? "%c"}|agohover`;
  const classes = `odate time_${data.value.timestamp}${format === null ? "" : ` format_${encodeURIComponent(new TextDecoder().decode(new TextEncoder().encode(format)))}`}`;
  return `<span class="${escapeHtml(classes)}">${label}</span>`;
}
