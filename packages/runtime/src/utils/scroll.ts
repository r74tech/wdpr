/**
 *
 * Scroll utility for navigating to elements by ID with a visual highlight.
 *
 * @module
 */

/**
 * Smoothly scroll to a DOM element by its `id` and briefly highlight it.
 *
 * Looks up the element via `document.getElementById`, scrolls it into
 * view centered vertically with smooth animation, and applies a
 * `wdpr-blink` CSS class for 1.5 seconds to provide visual feedback.
 * The host application is expected to define a `wdpr-blink` CSS rule
 * (e.g. a background flash) for the highlight effect.
 *
 * If no element with the given ID exists, this is a no-op.
 *
 * @param id - The `id` attribute of the target element (without `#`).
 * @param doc - The document to search in. Defaults to the global `document`.
 */
export function scrollToElement(id: string, doc?: Document): void {
  const d = doc ?? document;
  const el = d.getElementById(id);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });

  el.classList.add("wdpr-blink");
  setTimeout(() => {
    el.classList.remove("wdpr-blink");
  }, 1500);
}
