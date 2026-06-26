import type { LinkLocation } from "@wdprlib/ast";
import { escapeAttr } from "../../escape";
import { resolveSafeImageLinkHref } from "./link-href";

export function wrapImageLink(imageTag: string, link: LinkLocation | null): string {
  if (!link) {
    return imageTag;
  }

  const href = resolveSafeImageLinkHref(link);

  return `<a href="${escapeAttr(href)}">${imageTag}</a>`;
}
