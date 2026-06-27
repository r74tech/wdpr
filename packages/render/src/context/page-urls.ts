import type { LinkLocation } from "@wdprlib/ast";
import type { PageContext } from "../types";

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
  if (hashIdx !== -1) {
    let pagePart = page.slice(0, hashIdx);
    const anchor = page.slice(hashIdx);
    if (pagePart.endsWith("/")) {
      pagePart = pagePart.slice(0, -1);
    }
    return `/${pagePart.toLowerCase()}${anchor.toLowerCase()}`;
  }

  const normalizedPage = normalizePageName(page);
  const safePage = normalizedPage.startsWith("/") ? normalizedPage.slice(1) : normalizedPage;

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
  return domain.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

function normalizePageName(page: string): string {
  let normalized = page.toLowerCase();
  if (normalized.indexOf(":") !== -1) {
    normalized = normalized.replace(/:\s+/g, ":");
  }
  if (/\s/.test(normalized)) {
    normalized = normalized.replace(/\s+/g, "-").trim();
  }
  if (!normalized.startsWith("/") && normalized.indexOf("/") !== -1) {
    normalized = normalized.replace(/\//g, "-");
  }
  return normalized;
}
