export function isDangerousUrl(value: string): boolean {
  const normalized = stripControlAndWhitespace(value);
  return /^(javascript|data|vbscript):/i.test(normalized);
}

const WHITESPACE = /\s/;

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
