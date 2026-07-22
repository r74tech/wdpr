import type { GalleryItem } from "@wdprlib/ast";

/**
 * Parse one gallery content line (the text after the leading `: `,
 * already trimmed) into a {@link GalleryItem}.
 *
 * The text before the first space is the source; the rest is parsed as
 * `key="value"` attributes of which `link` and `alt` are honored. A
 * leading `*` on the source or on the link value requests a new window.
 */
export function parseGalleryItemLine(content: string): GalleryItem {
  const spacePos = content.indexOf(" ");
  let source = spacePos < 0 ? content : content.slice(0, spacePos);
  const attrText = spacePos < 0 ? "" : content.slice(spacePos + 1);

  let newWindow = false;
  if (source.startsWith("*")) {
    source = source.slice(1);
    newWindow = true;
  }

  const attrs = parseItemAttrs(attrText);
  let link = attrs.get("link") ?? null;
  if (link !== null && link.startsWith("*")) {
    newWindow = true;
    link = link.slice(1);
  }
  const alt = attrs.get("alt") ?? null;

  return { source, link, alt, newWindow };
}

/**
 * Parse `key="value"` attribute pairs from a gallery item line, following
 * the splitting behavior of Wikidot's gallery `getAttrs()`: fragments are
 * separated by `="`, values run to the last `"` in each fragment and are
 * backslash-unescaped, and keys are not lowercased.
 */
function parseItemAttrs(text: string): Map<string, string> {
  const attrs = new Map<string, string>();
  const parts = text.trim().split('="');
  let key = parts[0]?.trim() ?? "";

  for (let i = 1; i < parts.length; i++) {
    const val = parts[i] ?? "";
    const quotePos = val.lastIndexOf('"');
    if (quotePos < 0) {
      attrs.set(key, "");
      key = val.slice(1).trim();
    } else {
      attrs.set(key, stripslashes(val.slice(0, quotePos)));
      key = val.slice(quotePos + 1).trim();
    }
  }

  return attrs;
}

/** PHP-style `stripslashes()`: drop each escaping backslash, and a trailing lone one. */
function stripslashes(value: string): string {
  return value.replace(/\\(.)/gs, "$1").replace(/\\$/, "");
}
