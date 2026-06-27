import type { LinkLocation } from "@wdprlib/ast";
import { isDangerousUrl } from "../../escape";

export function resolveSafeImageLinkHref(link: LinkLocation): string {
  const href = resolveImageLinkHref(link);
  return isDangerousUrl(href) ? "#invalid-url" : href;
}

function resolveImageLinkHref(link: LinkLocation): string {
  if (typeof link !== "string") {
    return `/${link.page}`;
  }

  if (
    !link.startsWith("/") &&
    !link.startsWith("#") &&
    !link.startsWith("http://") &&
    !link.startsWith("https://")
  ) {
    return `/${link}`;
  }

  return link;
}
