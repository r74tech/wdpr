import type { LinkLocation } from "@wdprlib/ast";
import type { PageContext } from "../types";
import { normalizePageName } from "./page-name";

export function resolvePageLink(
  location: LinkLocation,
  pageContext: PageContext | undefined,
): string {
  if (typeof location === "string") {
    return location;
  }

  const page = location.page;
  if (page.startsWith("//")) {
    return page.toLowerCase();
  }

  const hashIdx = page.indexOf("#");
  const pagePart = hashIdx === -1 ? page : page.slice(0, hashIdx).replace(/\/$/, "");
  const anchor = hashIdx === -1 ? "" : page.slice(hashIdx).toLowerCase();
  // Slash-prefixed paths are routes rather than page slugs.
  const normalizedPage = page.includes("#/")
    ? pagePart.toLowerCase()
    : pagePart.startsWith("/")
      ? pagePart.toLowerCase().replace(/\s+/g, "-")
      : normalizePageName(pagePart);
  const safePage =
    (normalizedPage.startsWith("/") ? normalizedPage.slice(1) : normalizedPage) + anchor;

  if (location.site) {
    const domain = resolveSiteDomain(location.site, pageContext);
    if (domain !== null) {
      return `https://${domain}/${safePage}`;
    }
    return `/${normalizePageName(location.site)}/${safePage}`;
  }
  return `/${safePage}`;
}

function resolveSiteDomain(site: string, pageContext: PageContext | undefined): string | null {
  const configuredDomain =
    pageContext?.resolveSiteDomain?.(site) ??
    pageContext?.siteDomains?.[site] ??
    (pageContext?.site === site ? pageContext.domain : undefined);

  if (configuredDomain) return normalizeDomain(configuredDomain);
  if (site.includes(".")) {
    return normalizeDomain(site);
  }
  return null;
}

function normalizeDomain(domain: string): string {
  let normalized = domain;
  const lower = normalized.toLowerCase();
  if (lower.startsWith("https://")) {
    normalized = normalized.slice("https://".length);
  } else if (lower.startsWith("http://")) {
    normalized = normalized.slice("http://".length);
  }

  let end = normalized.length;
  while (end > 0 && normalized[end - 1] === "/") {
    end--;
  }
  return end === normalized.length ? normalized : normalized.slice(0, end);
}
