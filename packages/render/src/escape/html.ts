export function escapeHtml(text: string): string {
  let start = 0;
  let escaped = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    let replacement: string | null = null;
    if (char === "&") {
      replacement = "&amp;";
    } else if (char === "<") {
      replacement = "&lt;";
    } else if (char === ">") {
      replacement = "&gt;";
    }

    if (replacement) {
      if (start < i) {
        escaped += text.slice(start, i);
      }
      escaped += replacement;
      start = i + 1;
    }
  }

  if (start === 0) {
    return text;
  }
  return start < text.length ? escaped + text.slice(start) : escaped;
}

export function escapeAttr(value: string): string {
  if (
    value.indexOf("&") === -1 &&
    value.indexOf("<") === -1 &&
    value.indexOf(">") === -1 &&
    value.indexOf('"') === -1 &&
    value.indexOf("'") === -1
  ) {
    return value;
  }
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeStyleContent(css: string): string {
  if (css.indexOf("</") === -1) {
    return css;
  }
  return css.replace(/<\/style/gi, "<\\/style");
}

export function escapeJsString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\x27")
    .replace(/"/g, "\\x22")
    .replace(/</g, "\\x3c")
    .replace(/>/g, "\\x3e")
    .replace(/&/g, "\\x26")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
