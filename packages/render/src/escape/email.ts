/**
 * Validate that a string looks like a safe email address.
 *
 * Uses a deliberately simple pattern that accepts the vast majority of
 * real-world addresses while blocking characters that could enable
 * injection attacks when the address is used in a `mailto:` link.
 *
 * The percent character (`%`) is intentionally disallowed because
 * `mailto:` URLs undergo percent-decoding, allowing an attacker to
 * inject headers (e.g. `a%0d%0abcc%3aevil@example.com` decodes to
 * a BCC header injection).
 *
 * @param email - The email string to validate.
 * @returns `true` if the email matches the safe pattern.
 */
export function isValidEmail(email: string): boolean {
  // Simple email pattern: local@domain
  // - local: alphanumeric, dots, underscores, hyphens, plus signs (NO percent)
  // - domain: alphanumeric, dots, hyphens
  // Does NOT allow: spaces, colons, angle brackets, percent, or other special chars
  return /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}
