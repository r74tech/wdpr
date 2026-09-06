/**
 *
 * Renderer for Wikidot `[[gallery]]` elements.
 *
 * Emits a rationalized, theme-compatible markup: the Wikidot class names
 * `gallery-box` / `gallery-item <size>` / `with-lb` are kept, but the
 * legacy table wrapper is replaced with a plain `<figure>` per item.
 *
 * ```html
 * <div class="gallery-box" data-size="thumbnail">
 *   <figure class="gallery-item thumbnail">
 *     <a href="/local--files/page/a.jpg" class="with-lb"><img src="..." alt=""/></a>
 *   </figure>
 * </div>
 * ```
 *
 * - `with-lb` marks lightbox targets (see `initGallery` in
 *   `@wdprlib/runtime`): anchors whose href is the image itself, i.e.
 *   items without an explicit `link` and without a `*` new-window prefix.
 * - `data-viewer="false"` on the box disables the lightbox
 *   (`viewer="no"`).
 * - Items whose source is a dangerous URL are skipped; a dangerous link
 *   is ignored (the item then links to its own image).
 *
 * @module
 */
import type { GalleryData, GalleryItem, GallerySize } from "@wdprlib/ast";
import type { RenderContext } from "../../context";
import { joinSafeLocalPath, normalizeSafeLocalPath } from "../../context/local-path";
import { escapeAttr, isDangerousUrl } from "../../escape";
import { getImageSizeWidth } from "../image-size";
import { sortGalleryFiles } from "./sort";

export { sortGalleryFiles } from "./sort";

/** Wikidot's message for an auto gallery on a page without image attachments. */
const NO_IMAGES_MESSAGE = "Sorry, we couldn't find any images attached to this page.";
const ABSOLUTE_URL_WITH_AUTHORITY = /^[A-Za-z][A-Za-z0-9+.-]*:\/\//;

/** Render a gallery element (explicit items or auto-collected page files). */
export function renderGallery(ctx: RenderContext, data: GalleryData): void {
  const items = collectGalleryItems(ctx, data);
  if (items === null) {
    // Auto form on a page that provided files but has no images: Wikidot
    // replaces the whole gallery with an error block.
    ctx.push(`<div class="error-block">${NO_IMAGES_MESSAGE}</div>`);
    return;
  }

  const viewerAttr = data.viewer ? "" : ' data-viewer="false"';
  ctx.push(`<div class="gallery-box" data-size="${escapeAttr(data.size)}"${viewerAttr}>`);
  for (const item of items) {
    renderGalleryItem(ctx, item, data.size);
  }
  ctx.push("</div>");
}

/**
 * Determine the items to render. The auto form takes filenames from
 * `content.files` when a resolver pre-filled them, otherwise from the
 * page context's attachment list sorted by the gallery's `order`
 * (an unknown attachment list renders the no-images message).
 * Returns null for the "no images attached" error case.
 */
function collectGalleryItems(ctx: RenderContext, data: GalleryData): GalleryItem[] | null {
  if (data.content.type === "items") {
    return data.content.items;
  }

  let files: string[];
  if (data.content.files !== null) {
    files = data.content.files;
  } else {
    const pageFiles = ctx.page?.files;
    if (pageFiles === undefined) return null;
    files = sortGalleryFiles(pageFiles, data.order).map((f) => f.name);
  }

  if (files.length === 0) return null;
  return files.map(
    (file): GalleryItem => ({ source: file, link: null, alt: null, newWindow: false }),
  );
}

function renderGalleryItem(ctx: RenderContext, item: GalleryItem, size: GallerySize): void {
  const urls = resolveItemUrls(ctx, item.source);
  if (!urls) return;

  let href: string | null = null;
  if (item.link !== null) {
    const resolved = resolveGalleryLink(item.link);
    if (!isDangerousUrl(resolved)) {
      href = resolved;
    }
  }

  // Without a usable explicit link the anchor targets the image itself and
  // becomes a lightbox target (unless it opens in a new window).
  const withLb = href === null && !item.newWindow;
  if (href === null) {
    href = urls.imageHref;
  }

  const anchorAttrs = [`href="${escapeAttr(href)}"`];
  if (withLb) anchorAttrs.push('class="with-lb"');
  if (item.newWindow) anchorAttrs.push('target="_blank"', 'rel="noopener"');

  ctx.push(`<figure class="gallery-item ${size}">`);
  ctx.push(`<a ${anchorAttrs.join(" ")}>`);
  const imageAttrs = [`src="${escapeAttr(urls.src)}"`, `alt="${escapeAttr(item.alt ?? "")}"`];
  const presetWidth = getImageSizeWidth(size);
  if (presetWidth !== null) imageAttrs.push(`width="${presetWidth}"`);
  imageAttrs.push('loading="lazy"', 'decoding="async"');
  ctx.push(`<img ${imageAttrs.join(" ")}/>`);
  ctx.push("</a></figure>");
}

/**
 * Resolve an explicit item link: URLs (containing `://`), root-relative
 * paths and fragments pass through unchanged; anything else is a wiki page
 * name and gets a `/` prefix.
 */
function resolveGalleryLink(link: string): string {
  if (link.includes("://") || link.startsWith("/") || link.startsWith("#")) {
    return link;
  }
  return `/${link}`;
}

interface GalleryItemUrls {
  /** The original image URL used by `<img src>`. */
  src: string;
  /** URL of the full image (link target when the item has no explicit link) */
  imageHref: string;
}

/**
 * Resolve a raw gallery source to image URLs. A leading authority-bearing
 * scheme marks an external URL; every other source is validated as a local
 * path before it is joined to a local file endpoint.
 *
 * Returns null when the item cannot be rendered (dangerous external URL,
 * or local paths disabled by settings).
 */
function resolveItemUrls(ctx: RenderContext, source: string): GalleryItemUrls | null {
  if (ABSOLUTE_URL_WITH_AUTHORITY.test(source)) {
    if (isDangerousUrl(source)) return null;
    return { src: source, imageHref: source };
  }

  if (!ctx.settings.allowLocalPaths) return null;

  let path: string | null;
  if (source.includes("/")) {
    path = normalizeSafeLocalPath(source);
  } else {
    const pageName = ctx.page?.pageName;
    path = joinSafeLocalPath(pageName ? [pageName, source] : [source]);
  }
  if (path === null) return null;

  const imageHref = `/local--files/${path}`;
  return { src: imageHref, imageHref };
}
