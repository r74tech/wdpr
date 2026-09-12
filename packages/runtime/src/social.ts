/** Fill server-rendered share links from explicit metadata or the current document. */
export function initSocial(root: HTMLElement): void {
  for (const social of root.querySelectorAll<HTMLElement>("span.wdpr-social[data-wdpr-social]")) {
    const url = social.getAttribute("data-wdpr-social-url") ?? root.ownerDocument.URL;
    const title = social.getAttribute("data-wdpr-social-title") ?? root.ownerDocument.title;
    const validUrl = isHttpUrl(url);
    const values: Record<string, string> = { url, title, text: title ? `${title}\n\n${url}` : url };
    for (const link of social.querySelectorAll<HTMLAnchorElement>(
      ":scope > a[data-wdpr-social-template]",
    )) {
      const template = link.getAttribute("data-wdpr-social-template")!;
      // Keep encoding in sync with render/src/elements/social/index.ts.
      const href = template.replace(/\{(url|title|text)\}/g, (_, key: string) =>
        new URLSearchParams({ v: values[key]! }).toString().slice(2).replaceAll("+", "%20"),
      );
      if (
        validUrl &&
        isHttpUrl(href) &&
        (href.startsWith("https://") || href.startsWith("http://"))
      ) {
        link.setAttribute("href", href);
        link.removeAttribute("aria-disabled");
      } else {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
      }
    }
  }
}

function isHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
