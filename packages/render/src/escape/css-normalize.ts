/**
 * Normalize a CSS value by resolving escape sequences, removing comments,
 * stripping whitespace and control characters, and lowercasing.
 */
export function normalizeCssValue(value: string): string {
  let result = value;

  result = stripCssComments(result);
  result = result.replace(/\\(?:\r\n|[\n\r\f])/g, "");
  result = result.replace(/\\([0-9a-f]{1,6})\s?/gi, (_, hex) => {
    const code = Number.parseInt(hex, 16);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
  });
  result = result.replace(/\\(.)/g, "$1");
  result = stripControlAndWhitespace(result);

  return result.toLowerCase();
}

const WHITESPACE = /\s/;

function stripCssComments(value: string): string {
  let result = "";
  let cursor = 0;

  while (cursor < value.length) {
    const start = value.indexOf("/*", cursor);
    if (start === -1) {
      result += value.slice(cursor);
      break;
    }

    result += value.slice(cursor, start);
    const end = value.indexOf("*/", start + 2);
    if (end === -1) {
      break;
    }
    cursor = end + 2;
  }

  return result;
}

function stripControlAndWhitespace(value: string): string {
  let result = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (WHITESPACE.test(char) || code <= 0x1f || (code >= 0x7f && code <= 0x9f)) {
      continue;
    }
    result += char;
  }
  return result;
}
