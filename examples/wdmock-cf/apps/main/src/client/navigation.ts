export type NavigationDecision =
  | { kind: "internal"; pagePath: string; historyHref: string }
  | { kind: "browser" }
  | { kind: "blocked" };

const DANGEROUS_PROTOCOLS = new Set(["javascript:", "data:", "vbscript:"]);

/** Classify a link without relying on attacker-controlled string prefixes. */
export function classifyNavigation(href: string, currentHref: string): NavigationDecision {
  if (href.length === 0 || href.startsWith("#")) return { kind: "browser" };

  let current: URL;
  let target: URL;
  try {
    current = new URL(currentHref);
    target = new URL(href, current);
  } catch {
    return { kind: "browser" };
  }

  if (DANGEROUS_PROTOCOLS.has(target.protocol)) return { kind: "blocked" };

  const isHttp = target.protocol === "http:" || target.protocol === "https:";
  if (!isHttp || target.origin !== current.origin) return { kind: "browser" };

  const isSameDocumentFragment =
    target.pathname === current.pathname &&
    target.search === current.search &&
    target.href.includes("#");
  if (isSameDocumentFragment) return { kind: "browser" };

  const normalizedPath = target.pathname.replace(/^\/+/, "");

  return {
    kind: "internal",
    pagePath: normalizedPath || "main",
    historyHref: `/${normalizedPath}${target.search}${target.hash}`,
  };
}
