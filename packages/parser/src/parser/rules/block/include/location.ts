import type { PageRef } from "@wdprlib/ast";

/**
 * Parse page reference from include target.
 *
 * Formats:
 * - `page` -> `{ site: null, page: "page" }`
 * - `:site:page` -> `{ site: "site", page: "page" }`
 * - `fragment:name` -> `{ site: null, page: "fragment:name" }`
 */
export function parsePageRef(target: string): PageRef {
  if (target.startsWith(":")) {
    const rest = target.slice(1);
    const colonIndex = rest.indexOf(":");
    if (colonIndex !== -1) {
      return {
        site: rest.slice(0, colonIndex),
        page: rest.slice(colonIndex + 1),
      };
    }
  }

  return { site: null, page: target };
}
