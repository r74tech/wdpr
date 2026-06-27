export interface TemplateVariableMatch {
  raw: string;
  index: number;
  name: string;
  braceParam?: string;
  parenParam?: string;
  format?: string;
}

/**
 * Scans ListPages template variables without a backtracking regex.
 *
 * Supported syntax:
 * - `%%name%%`
 * - `%%name{param}%%`
 * - `%%name(param)%%`
 * - `%%name|format%%`
 */
export function scanTemplateVariables(template: string): TemplateVariableMatch[] {
  const matches: TemplateVariableMatch[] = [];
  let searchFrom = 0;

  while (searchFrom < template.length) {
    const start = template.indexOf("%%", searchFrom);
    if (start === -1) break;

    const contentStart = start + 2;
    const end = template.indexOf("%%", contentStart);
    if (end === -1) break;

    const parsed = parseTemplateVariableContent(template.slice(contentStart, end));
    if (parsed !== null) {
      matches.push({
        raw: template.slice(start, end + 2),
        index: start,
        ...parsed,
      });
    }

    searchFrom = end + 2;
  }

  return matches;
}

function parseTemplateVariableContent(
  content: string,
): Omit<TemplateVariableMatch, "raw" | "index"> | null {
  let cursor = 0;
  while (cursor < content.length && isVariableNameChar(content[cursor]!)) {
    cursor++;
  }
  if (cursor === 0) return null;

  const name = content.slice(0, cursor);
  let braceParam: string | undefined;
  let parenParam: string | undefined;
  let format: string | undefined;

  if (content[cursor] === "{") {
    const close = content.indexOf("}", cursor + 1);
    if (close === -1) return null;
    braceParam = content.slice(cursor + 1, close);
    cursor = close + 1;
  }

  if (content[cursor] === "(") {
    const close = content.indexOf(")", cursor + 1);
    if (close === -1) return null;
    const value = content.slice(cursor + 1, close);
    if (!isDigits(value)) return null;
    parenParam = value;
    cursor = close + 1;
  }

  if (content[cursor] === "|") {
    format = content.slice(cursor + 1);
    cursor = content.length;
  }

  if (cursor !== content.length) return null;
  return { name, braceParam, parenParam, format };
}

function isVariableNameChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a) || char === "_";
}

function isDigits(value: string): boolean {
  if (value.length === 0) return false;
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 0x30 || code > 0x39) return false;
  }
  return true;
}
