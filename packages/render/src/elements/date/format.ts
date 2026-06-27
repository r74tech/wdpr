/**
 * Format a `Date` using a subset of `strftime` specifiers.
 *
 * Supported specifiers: `%Y` (4-digit year), `%m` (zero-padded month),
 * `%d` (zero-padded day), `%H` (zero-padded hours), `%M` (zero-padded
 * minutes), `%S` (zero-padded seconds).
 *
 * @param date - The date to format.
 * @param format - A strftime-compatible format string.
 * @returns The formatted date string.
 */
export function formatDate(date: Date, format: string): string {
  return format
    .replace(/%Y/g, String(date.getFullYear()))
    .replace(/%m/g, String(date.getMonth() + 1).padStart(2, "0"))
    .replace(/%d/g, String(date.getDate()).padStart(2, "0"))
    .replace(/%H/g, String(date.getHours()).padStart(2, "0"))
    .replace(/%M/g, String(date.getMinutes()).padStart(2, "0"))
    .replace(/%S/g, String(date.getSeconds()).padStart(2, "0"));
}
