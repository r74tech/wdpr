/**
 * @module elements/embed
 *
 * Renderer for inline embed elements (`[[embed]]`) that reference
 * third-party content providers.
 *
 * Supported providers:
 * - YouTube (`[[embedvideo youtube:VIDEO_ID]]`)
 * - Vimeo (`[[embedvideo vimeo:VIDEO_ID]]`)
 * - GitHub Gist (`[[embed github-gist:USER/HASH]]`)
 * - GitLab Snippet (`[[embed gitlab-snippet:ID]]`)
 *
 * Each provider has a strict ID validation function to prevent path
 * traversal, injection, and other attacks via embed parameters.
 */

import type { Embed } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr } from "../escape";

// =============================================================================
// ID Validation
// Prevents path traversal and injection via embed parameters
// =============================================================================

/**
 * Validate a YouTube or Vimeo video ID.
 * Only alphanumeric characters, underscores, and hyphens are allowed.
 *
 * @param id - The video ID string to validate.
 * @returns `true` if the ID contains only safe characters.
 */
function isValidVideoId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Validate a GitHub username (alphanumeric + hyphen, 1-39 characters).
 *
 * @param username - The GitHub username to validate.
 * @returns `true` if the username matches GitHub's format rules.
 */
function isValidGithubUsername(username: string): boolean {
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username);
}

/**
 * Validate a GitHub Gist hash (lowercase hex characters only).
 *
 * @param hash - The gist hash string to validate.
 * @returns `true` if the hash contains only hex characters.
 */
function isValidGistHash(hash: string): boolean {
  return /^[a-f0-9]+$/.test(hash);
}

/**
 * Validate a GitLab snippet ID (numeric digits only).
 *
 * @param id - The snippet ID string to validate.
 * @returns `true` if the ID is numeric.
 */
function isValidGitlabSnippetId(id: string): boolean {
  return /^[0-9]+$/.test(id);
}

// =============================================================================
// Render Functions
// =============================================================================

/**
 * Render an inline embed element by dispatching to the appropriate
 * provider-specific renderer.
 *
 * Invalid provider parameters (e.g. a video ID containing path traversal
 * characters) result in an HTML comment instead of the embed.
 *
 * @param ctx - The current render context.
 * @param data - Embed data with provider type and provider-specific fields.
 */
export function renderEmbed(ctx: RenderContext, data: Embed): void {
  switch (data.embed) {
    case "youtube":
      renderYoutube(ctx, data.data["video-id"]);
      break;
    case "vimeo":
      renderVimeo(ctx, data.data["video-id"]);
      break;
    case "github-gist":
      renderGithubGist(ctx, data.data.username, data.data.hash);
      break;
    case "gitlab-snippet":
      renderGitlabSnippet(ctx, data.data["snippet-id"]);
      break;
  }
}

/**
 * Render a YouTube embed as a responsive iframe.
 *
 * @param ctx - The current render context.
 * @param videoId - YouTube video ID (validated before use).
 */
function renderYoutube(ctx: RenderContext, videoId: string): void {
  if (!isValidVideoId(videoId)) {
    ctx.push(`<!-- Invalid YouTube video ID -->`);
    return;
  }
  ctx.push(`<div class="embed-youtube">`);
  ctx.push(
    `<iframe src="https://www.youtube.com/embed/${escapeAttr(videoId)}" ` +
      `frameborder="0" allowfullscreen></iframe>`,
  );
  ctx.push("</div>");
}

/**
 * Render a Vimeo embed as a responsive iframe.
 *
 * @param ctx - The current render context.
 * @param videoId - Vimeo video ID (validated before use).
 */
function renderVimeo(ctx: RenderContext, videoId: string): void {
  if (!isValidVideoId(videoId)) {
    ctx.push(`<!-- Invalid Vimeo video ID -->`);
    return;
  }
  ctx.push(`<div class="embed-vimeo">`);
  ctx.push(
    `<iframe src="https://player.vimeo.com/video/${escapeAttr(videoId)}" ` +
      `frameborder="0" allowfullscreen></iframe>`,
  );
  ctx.push("</div>");
}

/**
 * Render a GitHub Gist embed as a `<script>` tag.
 *
 * @param ctx - The current render context.
 * @param username - GitHub username owning the gist (validated before use).
 * @param hash - Gist hash identifier (validated before use).
 */
function renderGithubGist(ctx: RenderContext, username: string, hash: string): void {
  if (!isValidGithubUsername(username) || !isValidGistHash(hash)) {
    ctx.push(`<!-- Invalid GitHub Gist parameters -->`);
    return;
  }
  ctx.push(
    `<script src="https://gist.github.com/${escapeAttr(username)}/${escapeAttr(hash)}.js"></script>`,
  );
}

/**
 * Render a GitLab Snippet embed as a `<script>` tag.
 *
 * @param ctx - The current render context.
 * @param snippetId - GitLab snippet ID (validated before use).
 */
function renderGitlabSnippet(ctx: RenderContext, snippetId: string): void {
  if (!isValidGitlabSnippetId(snippetId)) {
    ctx.push(`<!-- Invalid GitLab snippet ID -->`);
    return;
  }
  ctx.push(`<script src="https://gitlab.com/snippets/${escapeAttr(snippetId)}.js"></script>`);
}
