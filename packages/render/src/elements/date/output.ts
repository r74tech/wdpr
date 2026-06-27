import { escapeHtml } from "../../escape";

export function renderDateOutput(formatted: string, hover: boolean): string {
  const escaped = escapeHtml(formatted);
  return hover ? `<span class="odate">${escaped}</span>` : escaped;
}
