import type { PagerData } from "@wdprlib/ast";
import type { RenderContext } from "../context";
import { escapeHtml } from "../escape";
import { renderAnchor } from "./link";

export function renderPager(ctx: RenderContext, data: PagerData): void {
  if (data.totalPages <= 1) return;
  ctx.push('<div class="pager"><span class="pager-no">');
  ctx.push(
    ctx.messages.html(
      { id: "pager.info", defaultMessage: "page {current} of {total}" },
      { current: String(data.currentPage), total: String(data.totalPages) },
      {},
    ),
  );
  ctx.push("</span>");

  const previous = data.pages.find(({ page }) => page === data.currentPage - 1);
  if (previous) {
    renderPagerLink(
      ctx,
      previous.href,
      ctx.messages.text({
        id: "pager.previous",
        defaultMessage: "« previous",
      }),
    );
  }
  let lastPage = 0;
  for (const { page, href } of data.pages) {
    if (page > lastPage + 1) ctx.push(' <span class="dots">...</span>');
    if (page === data.currentPage) {
      ctx.push(` <span class="current">${escapeHtml(String(page))}</span>`);
    } else {
      renderPagerLink(ctx, href, String(page));
    }
    lastPage = page;
  }
  const next = data.pages.find(({ page }) => page === data.currentPage + 1);
  if (next) {
    renderPagerLink(
      ctx,
      next.href,
      ctx.messages.text({
        id: "pager.next",
        defaultMessage: "next »",
      }),
    );
  }
  ctx.push("</div>");
}

function renderPagerLink(ctx: RenderContext, href: string, label: string): void {
  ctx.push(' <span class="target">');
  renderAnchor(ctx, {
    target: null,
    attributes: { href },
    elements: [{ element: "text", data: label }],
  });
  ctx.push("</span>");
}
