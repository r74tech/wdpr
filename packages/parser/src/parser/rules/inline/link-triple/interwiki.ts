const INTERWIKI_PREFIXES = new Set(["wikipedia", "google", "dictionary", "wikidot"]);

export function isInterwikiTarget(target: string): boolean {
  const colonIdx = target.indexOf(":");
  if (colonIdx <= 0 || target.includes("/")) {
    return false;
  }

  const prefix = target.slice(0, colonIdx).toLowerCase();
  return INTERWIKI_PREFIXES.has(prefix);
}
