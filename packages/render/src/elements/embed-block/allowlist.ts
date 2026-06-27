/**
 * Allowlist entry for embed content validation.
 */
export interface EmbedAllowlistEntry {
  /** Host pattern. Supports wildcard prefix `*.` such as `*.youtube.com`. */
  host: string;
  /** Optional path prefix that must match, such as `/embed/`. */
  pathPrefix?: string;
}

/**
 * Default allowlist for embed content.
 *
 * Set the render option to `null` to allow any HTTP(S) iframe while still using
 * sanitizer and scheme validation.
 */
export const DEFAULT_EMBED_ALLOWLIST: EmbedAllowlistEntry[] | null = [
  { host: "*.youtube.com", pathPrefix: "/embed/" },
  { host: "*.youtube-nocookie.com", pathPrefix: "/embed/" },
  { host: "player.vimeo.com", pathPrefix: "/video/" },
  { host: "*.google.com", pathPrefix: "/maps/embed" },
  { host: "calendar.google.com", pathPrefix: "/calendar/embed" },
  { host: "open.spotify.com", pathPrefix: "/embed/" },
  { host: "w.soundcloud.com", pathPrefix: "/player/" },
  { host: "codepen.io" },
];

/**
 * Check whether a URL matches an allowlist entry's host and optional path prefix.
 */
export function matchesAllowlistEntry(url: URL, entry: EmbedAllowlistEntry): boolean {
  if (!matchesHostPattern(url.hostname, entry.host)) {
    return false;
  }
  if (entry.pathPrefix) {
    const pathLower = url.pathname.toLowerCase();
    const prefixLower = entry.pathPrefix.toLowerCase();
    if (!pathLower.startsWith(prefixLower)) {
      return false;
    }
    if (!prefixLower.endsWith("/")) {
      const remainder = pathLower.slice(prefixLower.length);
      if (remainder && !/^[/?#]/.test(remainder)) {
        return false;
      }
    }
  }
  return true;
}

function matchesHostPattern(hostname: string, pattern: string): boolean {
  const lowerHostname = hostname.toLowerCase();
  const lowerPattern = pattern.toLowerCase();

  if (lowerPattern.startsWith("*.")) {
    const base = lowerPattern.slice(2);
    return lowerHostname === base || lowerHostname.endsWith("." + base);
  }
  return lowerHostname === lowerPattern;
}
