import type { Embed } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeAttr } from "../escape";

// =============================================================================
// ID Validation
// Prevents path traversal and injection via embed parameters
// =============================================================================

/** YouTube/Vimeo video ID: alphanumeric + underscore/hyphen */
function isValidVideoId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/** GitHub username: alphanumeric + hyphen, 1-39 chars */
function isValidGithubUsername(username: string): boolean {
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username);
}

/** Gist hash: hex characters (variable length, typically 20-32) */
function isValidGistHash(hash: string): boolean {
  return /^[a-f0-9]+$/.test(hash);
}

/** GitLab snippet ID: numeric only */
function isValidGitlabSnippetId(id: string): boolean {
  return /^[0-9]+$/.test(id);
}

// =============================================================================
// Render Functions
// =============================================================================

/** Render an embed element */
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

function renderGithubGist(ctx: RenderContext, username: string, hash: string): void {
  if (!isValidGithubUsername(username) || !isValidGistHash(hash)) {
    ctx.push(`<!-- Invalid GitHub Gist parameters -->`);
    return;
  }
  ctx.push(
    `<script src="https://gist.github.com/${escapeAttr(username)}/${escapeAttr(hash)}.js"></script>`,
  );
}

function renderGitlabSnippet(ctx: RenderContext, snippetId: string): void {
  if (!isValidGitlabSnippetId(snippetId)) {
    ctx.push(`<!-- Invalid GitLab snippet ID -->`);
    return;
  }
  ctx.push(`<script src="https://gitlab.com/snippets/${escapeAttr(snippetId)}.js"></script>`);
}
