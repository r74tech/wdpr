/**
 * Escape HTML special characters for use inside highlighted code spans.
 */
export function escapeHighlightHtml(str: string): string {
  if (
    str.indexOf("&") === -1 &&
    str.indexOf("<") === -1 &&
    str.indexOf(">") === -1 &&
    str.indexOf('"') === -1
  ) {
    return str;
  }

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
