import type { RenderContext } from "../../context";
import { escapeAttr } from "../../escape";
import { renderEmbedIframe } from "./iframe";
import {
  isValidGithubUsername,
  isValidGistHash,
  isValidGitlabSnippetId,
  isValidVideoId,
} from "./validation";

export function renderYoutube(ctx: RenderContext, videoId: string): void {
  if (!isValidVideoId(videoId)) {
    ctx.push(`<!-- Invalid YouTube video ID -->`);
    return;
  }
  renderEmbedIframe(ctx, "embed-youtube", `https://www.youtube.com/embed/${videoId}`);
}

export function renderVimeo(ctx: RenderContext, videoId: string): void {
  if (!isValidVideoId(videoId)) {
    ctx.push(`<!-- Invalid Vimeo video ID -->`);
    return;
  }
  renderEmbedIframe(ctx, "embed-vimeo", `https://player.vimeo.com/video/${videoId}`);
}

export function renderGithubGist(ctx: RenderContext, username: string, hash: string): void {
  if (!isValidGithubUsername(username) || !isValidGistHash(hash)) {
    ctx.push(`<!-- Invalid GitHub Gist parameters -->`);
    return;
  }
  ctx.push(
    `<script src="https://gist.github.com/${escapeAttr(username)}/${escapeAttr(hash)}.js"></script>`,
  );
}

export function renderGitlabSnippet(ctx: RenderContext, snippetId: string): void {
  if (!isValidGitlabSnippetId(snippetId)) {
    ctx.push(`<!-- Invalid GitLab snippet ID -->`);
    return;
  }
  ctx.push(`<script src="https://gitlab.com/snippets/${escapeAttr(snippetId)}.js"></script>`);
}
