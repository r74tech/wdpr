/**
 *
 * Renderer for inline embed elements (`[[embed]]`) that reference
 * third-party content providers.
 *
 * @module
 */

import type { Embed } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { renderGithubGist, renderGitlabSnippet, renderVimeo, renderYoutube } from "./providers";

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
