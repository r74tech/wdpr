const SERVICES = [
  "twitter",
  "x",
  "bluesky",
  "mastodon",
  "linkedin",
  "hatena",
  "facebook",
  "reddit",
] as const;
export type SocialService = (typeof SERVICES)[number];
const supported: ReadonlySet<string> = new Set(SERVICES);

// Twitter selects the legacy bird for the same destination; default to X once.
const defaults: readonly SocialService[] = SERVICES.filter((site) => site !== "twitter").sort();

/** Omit unsupported names, retaining explicit order and duplicates. */
export function resolveSocialServices(sites: readonly string[] | null): SocialService[] {
  return (sites ?? defaults).flatMap((site) => {
    const name = site.trim().toLowerCase();
    return supported.has(name) ? [name as SocialService] : [];
  });
}
