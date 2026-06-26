/**
 * Normalize a CSS value by resolving escape sequences, removing comments,
 * stripping whitespace and control characters, and lowercasing.
 */
export function normalizeCssValue(value: string): string {
  let result = value;

  result = result.replace(/\/\*[\s\S]*?\*\//g, "");
  result = result.replace(/\\(?:\r\n|[\n\r\f])/g, "");
  result = result.replace(/\\([0-9a-f]{1,6})\s?/gi, (_, hex) => {
    const code = Number.parseInt(hex, 16);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
  });
  result = result.replace(/\\(.)/g, "$1");
  result = result.replace(/[\s\u0000-\u001f\u007f-\u009f]/g, "");

  return result.toLowerCase();
}
