import type { SocialData } from "@wdprlib/ast";
import { resolveSocialServices, type SocialService } from "./services";
import type { RenderContext } from "../../context";
import { escapeAttr } from "../../escape";
import { socialIconPaths } from "./icons";

// Adapted from Shareon; see THIRD-PARTY-LICENSES.md for sources and licenses.
const services: Record<SocialService, { label: string; template: string }> = {
  twitter: { label: "Twitter", template: "https://x.com/intent/tweet?url={url}&text={title}" },
  x: { label: "X", template: "https://x.com/intent/tweet?url={url}&text={title}" },
  hatena: {
    label: "はてなブックマーク",
    template: "https://b.hatena.ne.jp/entry/panel/?url={url}#bbutton",
  },
  linkedin: {
    label: "LinkedIn",
    template: "https://www.linkedin.com/sharing/share-offsite/?url={url}",
  },
  bluesky: { label: "Bluesky", template: "https://bsky.app/intent/compose?text={text}" },
  mastodon: { label: "Mastodon", template: "https://share.joinmastodon.org/#text={text}" },
  facebook: { label: "Facebook", template: "https://www.facebook.com/sharer/sharer.php?u={url}" },
  reddit: { label: "Reddit", template: "https://www.reddit.com/submit?url={url}&title={title}" },
};

function validUrl(url: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

// Keep encoding in sync with the independent runtime's social.ts.
function shareHref(template: string, url: string, title: string): string {
  const values: Record<string, string> = { url, title, text: title ? `${title}\n\n${url}` : url };
  return template.replace(/\{(url|title|text)\}/g, (_, key: string) =>
    new URLSearchParams({ v: values[key]! }).toString().slice(2).replaceAll("+", "%20"),
  );
}

export function renderSocial(ctx: RenderContext, data: SocialData): void {
  const metadata = ctx.options.socialShare;
  const url = metadata?.url;
  let attrs = ` class="wdpr-social" data-wdpr-social="${escapeAttr(JSON.stringify(data.sites))}"`;
  if (url !== undefined) attrs += ` data-wdpr-social-url="${escapeAttr(url)}"`;
  if (metadata?.title !== undefined)
    attrs += ` data-wdpr-social-title="${escapeAttr(metadata.title)}"`;
  ctx.push(`<span${attrs}>`);
  resolveSocialServices(data.sites).forEach((site, index) => {
    const { label, template } = services[site];
    const href =
      url !== undefined && validUrl(url)
        ? `href="${escapeAttr(shareHref(template, url, metadata?.title ?? ""))}"`
        : 'aria-disabled="true"';
    if (index > 0) ctx.push(" ");
    ctx.push(
      `<a data-wdpr-social-site="${site}" data-wdpr-social-template="${escapeAttr(template)}" ${href} target="_blank" rel="noopener noreferrer" title="${escapeAttr(label)}" aria-label="${escapeAttr(label)}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="${socialIconPaths[site]}"></path></svg></a>`,
    );
  });
  ctx.push("</span>");
}
