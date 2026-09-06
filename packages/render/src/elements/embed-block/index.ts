/**
 * Renderer for `[[embed]]...[[/embed]]` block-level embeds.
 *
 * @module
 */

import type { EmbedBlockData } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { escapeHtml } from "../../escape";
import { DEFAULT_EMBED_ALLOWLIST, type EmbedAllowlistEntry } from "./allowlist";
import { normalizeBooleanAttributes, validateAndSanitizeEmbed } from "./sanitize";

export { DEFAULT_EMBED_ALLOWLIST, type EmbedAllowlistEntry } from "./allowlist";

/**
 * Render an `[[embed]]...[[/embed]]` block element.
 *
 * The raw HTML content is validated and sanitized through the full pipeline. On
 * failure, a Wikidot-compatible error block is shown.
 */
export function renderEmbedBlock(ctx: RenderContext, data: EmbedBlockData): void {
  const allowlist: EmbedAllowlistEntry[] | null =
    ctx.options.embedAllowlist !== undefined ? ctx.options.embedAllowlist : DEFAULT_EMBED_ALLOWLIST;

  const sanitized = validateAndSanitizeEmbed(data.contents, allowlist, ctx.options.baseUrl);
  if (sanitized === null) {
    ctx.push(
      `<div class="error-block">${escapeHtml(ctx.messages.text({ id: "embed.invalid", defaultMessage: "Sorry, no match for the embedded content." }))}</div>`,
    );
    return;
  }

  ctx.push(`<p>${normalizeBooleanAttributes(sanitized)}</p>`);
}
