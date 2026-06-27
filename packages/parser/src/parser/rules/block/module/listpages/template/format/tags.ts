/**
 * Format an array of tags as space-separated Wikidot link syntax.
 */
export function formatTagsLinked(tags: string[], prefix: string): string {
  if (tags.length === 0) return "";
  return tags.map((tag) => `[${prefix}${tag} ${tag}]`).join(" ");
}
