/**
 * Validate email format to prevent injection attacks.
 * Uses a simple pattern that allows most valid emails while blocking dangerous inputs.
 *
 * Security note: % is NOT allowed to prevent mailto: percent-decode attacks
 * (e.g., a%0d%0abcc%3aevil@example.com could inject headers).
 *
 * NOTE: Keep in sync with packages/render/src/escape.ts isValidEmail()
 */
function isValidEmail(email: string): boolean {
  // Simple email pattern: local@domain
  // - local: alphanumeric, dots, underscores, hyphens, plus signs (NO percent)
  // - domain: alphanumeric, dots, hyphens
  // Does NOT allow: spaces, colons, angle brackets, percent, or other special chars
  return /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

/** Decode obfuscated email elements and replace with mailto links */
export function initEmail(root: HTMLElement): void {
  const elements = root.querySelectorAll<HTMLElement>("span.wiki-email");
  for (const el of elements) {
    processEmail(el);
  }
}

function processEmail(el: HTMLElement): void {
  const obfuscated = el.textContent;
  if (!obfuscated) return;

  // Wikidot obfuscation: reversed string with | instead of @
  const reversed = obfuscated.split("").reverse().join("");
  const email = reversed.replace(/\|/g, "@");

  // Validate email format before creating link
  if (!isValidEmail(email)) {
    // Invalid email: just show as text, don't create link
    return;
  }

  const doc = el.ownerDocument;
  const link = doc.createElement("a");
  link.href = `mailto:${email}`;
  link.textContent = email;

  el.replaceWith(link);
}
