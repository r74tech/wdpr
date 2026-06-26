import { escapeHighlightHtml } from "./html";
import type { HighlightToken } from "./token";

/**
 * Render an array of tokens to HTML with `hl-*` class spans.
 */
export function renderTokens(tokens: HighlightToken[]): string {
  if (tokens.length === 0) return "";

  let html = "";
  let lastClass = "";

  for (const token of tokens) {
    if (token.content.length === 0) continue;
    const escaped = escapeHighlightHtml(token.content);
    if (token.class !== lastClass) {
      if (lastClass) {
        html += "</span>";
      }
      html += `<span class="hl-${token.class}">`;
      lastClass = token.class;
    }
    html += escaped;
  }

  if (lastClass) {
    html += "</span>";
  }

  return `<div class="hl-main"><pre>${html}</pre></div>`;
}
