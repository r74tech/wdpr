/**
 * Page fullname utilities
 */

export interface PageIdentity {
  category: string;
  name: string;
}

/**
 * Parse URL path to page identity
 */
export function parseFullname(path: string): PageIdentity {
  const cleaned = path.replace(/^\/+|\/+$/g, "");

  if (!cleaned) {
    return { category: "_default", name: "main" };
  }

  const segments = cleaned.split("/");
  const pageSegment = segments[0];

  if (pageSegment.includes(":")) {
    const [category, ...rest] = pageSegment.split(":");
    return { category, name: rest.join(":") };
  }

  return { category: "_default", name: pageSegment };
}

/**
 * Build fullname from category and name
 */
export function buildFullname(category: string, name: string): string {
  return category === "_default" ? name : `${category}:${name}`;
}
