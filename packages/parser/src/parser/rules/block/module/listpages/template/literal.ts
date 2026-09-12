/** Protect text before secondary include expansion and wikitext parsing. */
export function literalWikitext(value: string): string {
  if (value === "") return "";
  // Encode delimiters and newlines too: a value cannot close this raw region.
  return `@<${Array.from(value, (char) => `&#${char.codePointAt(0)};`).join("")}>@`;
}
