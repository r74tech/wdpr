/**
 *
 * Runtime module for deobfuscating email addresses.
 *
 * Wikidot obfuscates email addresses in the rendered HTML by reversing
 * the string and replacing `@` with `|`, then wrapping it in
 * `<span class="wiki-email">`. This module finds those spans and
 * replaces them with proper `<a href="mailto:...">` links.
 *
 * This is a one-shot initialization (no event listeners to clean up).
 *
 * @module
 */

/**
 * Validate email format to prevent injection attacks.
 *
 * Uses a simple pattern that allows most valid emails while blocking
 * dangerous inputs. `%` is NOT allowed to prevent `mailto:` percent-decode
 * attacks (e.g., `a%0d%0abcc%3aevil@example.com` could inject headers).
 *
 * This function must be kept in sync with `packages/render/src/escape.ts`
 * `isValidEmail()`.
 *
 * @param email - Email string to validate.
 * @returns `true` if the email matches the safe pattern.
 */
function isValidEmail(email: string): boolean {
  // Simple email pattern: local@domain
  // - local: alphanumeric, dots, underscores, hyphens, plus signs (NO percent)
  // - domain: alphanumeric, dots, hyphens
  // Does NOT allow: spaces, colons, angle brackets, percent, or other special chars
  return /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

/**
 * Decode obfuscated email elements and replace them with `mailto:` links.
 *
 * Finds all `<span class="wiki-email">` elements within the root,
 * deobfuscates the email address (reverse + replace `|` with `@`),
 * validates the result, and replaces the span with an `<a href="mailto:">` link.
 *
 * This is a one-shot operation with no event listeners to clean up.
 *
 * @param root - The root DOM element containing rendered Wikidot markup.
 */
export function initEmail(root: HTMLElement): void {
  const elements = root.querySelectorAll<HTMLElement>("span.wiki-email");
  for (const el of elements) {
    processEmail(el);
  }
}

/**
 * Process a single obfuscated email element by deobfuscating and replacing
 * it with a mailto link.
 *
 * The deobfuscation reverses the text content and replaces `|` with `@`.
 * If the resulting email fails validation, the element is left unchanged.
 *
 * @param el - The `<span class="wiki-email">` element to process.
 */
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
