import type { TextExcerptOptions } from "@wdprlib/ast";

/** Find }%% outside quoted excerpt arguments, allowing regex quantifiers and literal %%. */
export function findExcerptEnd(template: string, contentStart: number): number {
  let quote: string | undefined;
  for (let cursor = contentStart + "excerpt{".length; cursor < template.length; cursor++) {
    const char = template[cursor];
    if (quote) {
      if (char === "\\") cursor++;
      else if (char === quote) quote = undefined;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "}") {
      return template.startsWith("%%", cursor + 1) ? cursor + 1 : -1;
    }
  }
  return -1;
}

/** Excerpt uses quoted named arguments; regex backslashes stay literal. */
export function parseExcerptOptions(input: string): TextExcerptOptions | null {
  if (input.length > 8_192) return null;
  const attributes = new Map<string, string>();
  let cursor = 0;
  while (cursor < input.length) {
    while (cursor < input.length && /\s/.test(input[cursor]!)) cursor++;
    if (cursor === input.length) break;
    const start = cursor;
    while (cursor < input.length && /[a-z]/.test(input[cursor]!)) cursor++;
    const name = input.slice(start, cursor);
    if (!["pattern", "flags", "group", "match", "max"].includes(name) || attributes.has(name))
      return null;
    while (cursor < input.length && /\s/.test(input[cursor]!)) cursor++;
    if (input[cursor++] !== "=") return null;
    while (cursor < input.length && /\s/.test(input[cursor]!)) cursor++;
    const quote = input[cursor++];
    if (quote !== '"' && quote !== "'") return null;
    let value = "";
    while (cursor < input.length && input[cursor] !== quote) {
      if (input[cursor] === "\\" && (input[cursor + 1] === quote || input[cursor + 1] === "\\")) {
        value += input[cursor + 1] === quote ? quote : "\\\\";
        cursor += 2;
      } else value += input[cursor++];
    }
    if (input[cursor++] !== quote) return null;
    if (cursor < input.length && !/\s/.test(input[cursor]!)) return null;
    attributes.set(name, value);
  }
  const pattern = attributes.get("pattern");
  if (pattern === undefined) return null;
  const group = attributes.get("group");
  const match = attributes.get("match");
  const max = attributes.get("max");
  if ((match !== undefined && !/^\d+$/.test(match)) || (max !== undefined && !/^\d+$/.test(max)))
    return null;
  return {
    pattern,
    flags: attributes.get("flags"),
    group: group === undefined ? undefined : /^\d+$/.test(group) ? Number(group) : group,
    match: match === undefined ? undefined : Number(match),
    maxLength: max === undefined ? undefined : Number(max),
  };
}
