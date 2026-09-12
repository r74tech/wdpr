/** Button's quoted attributes use Text_Wiki's getAttrs splitting rules. */
export function parseButtonAttributes(source: string): Record<string, string> {
  const sections = source.trim().split('="');
  const attrs: Record<string, string> = {};
  let key = sections[0]!.trim();
  for (const section of sections.slice(1)) {
    const quote = section.lastIndexOf('"');
    if (quote < 0) continue;
    if (key === "text" || key === "class" || key === "style") {
      attrs[key] = section
        .slice(0, quote)
        .replace(/\\([\s\S]|$)/g, (_match, char: string) => (char === "0" ? "\0" : char));
    }
    key = section.slice(quote + 1).trim();
  }
  return attrs;
}
