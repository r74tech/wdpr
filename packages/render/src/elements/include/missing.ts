import type { RenderContext } from "../../context";
import { escapeAttr } from "../../escape";

export function renderMissingInclude(ctx: RenderContext, page: string): void {
  const pageName = page.toLowerCase();
  const safePath = encodeIncludeEditPath(pageName);
  ctx.push(
    `<div class="error-block"><p>${ctx.messages.html(
      {
        id: "include.missing",
        defaultMessage:
          'Included page "{page}" does not exist (<createLink>create it now</createLink>)',
      },
      { page: pageName },
      {
        createLink: (html) => `<a href="/${escapeAttr(safePath)}/edit/true">${html}</a>`,
      },
    )}</p></div>`,
  );
}

function encodeIncludeEditPath(pageName: string): string {
  const encodedPageName = pageName.replace(/[^a-z0-9\-_:/]/g, (c) => encodeURIComponent(c));
  return encodedPageName.startsWith("/") ? encodedPageName.slice(1) : encodedPageName;
}
