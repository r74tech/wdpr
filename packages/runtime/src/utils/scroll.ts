/** Scroll to an element by ID and briefly highlight it */
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
