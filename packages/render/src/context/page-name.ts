/** Normalize a page slug, following scpwiki/wikidot-normalize's character rules. */
export function normalizePageName(page: string): string {
  let name = Array.from(page.trim().replace(/^\//, "").normalize("NFKC"), (char) =>
    char.toLowerCase(),
  )
    .join("")
    .replace(/[^\p{L}\p{N}:_-]/gu, "-");
  const category = name.lastIndexOf(":");
  if (category !== -1) {
    name = name.slice(0, category).replace(/:/g, "-") + name.slice(category);
  }
  name = name
    .replace(/(?<!^|:)_/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/-*([:_])-*/g, "$1")
    .replace(/^:|:$/g, "");
  return name.startsWith("_default:") ? name.slice(9) : name;
}
