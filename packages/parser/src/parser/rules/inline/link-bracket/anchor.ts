export function normalizeAnchor(anchor: string): string {
  return anchor.toLowerCase().replace(/\s+/g, "-");
}
