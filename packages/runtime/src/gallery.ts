/**
 *
 * Runtime module for `[[gallery]]` lightbox behavior.
 *
 * The renderer marks lightbox-enabled gallery anchors with the `with-lb`
 * class (anchors whose href is the image itself) and disabled viewers
 * with `data-viewer="false"` on the `.gallery-box`. This module attaches
 * a delegated click listener that opens a `<dialog>`-based lightbox:
 *
 * - shows the clicked anchor's image with its alt text as a caption
 * - previous / next buttons and arrow keys navigate within the same
 *   gallery box, wrapping at the ends
 * - Esc (native dialog cancel), the close button, or a backdrop click
 *   close the dialog; focus returns to the anchor that opened it
 *
 * Environments without `HTMLDialogElement.showModal` get no listeners at
 * all — clicks fall through to normal link navigation.
 *
 * A small stylesheet is injected once per document and reference-counted
 * across `initGallery()` instances; consumers can override the
 * `wdpr-lightbox*` classes.
 *
 * The `destroy()` cleanup removes the listeners, the dialog element, and
 * (at refcount zero) the injected stylesheet.
 *
 * @module
 */

import type { ModuleCleanup } from "./types";
import { isElement } from "./utils/dom";

const STYLE_ID = "wdpr-gallery-lightbox-style";

const STYLE_TEXT = [
  "dialog.wdpr-lightbox{border:0;padding:0;background:transparent;overflow:visible}",
  "dialog.wdpr-lightbox::backdrop{background:rgba(0,0,0,0.85)}",
  ".wdpr-lightbox-body{display:flex;align-items:center;gap:0.5rem}",
  ".wdpr-lightbox-figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:0.5rem}",
  ".wdpr-lightbox-figure img{display:block;max-width:85vw;max-height:85vh}",
  ".wdpr-lightbox-caption{color:#fff;text-align:center;font-size:0.875rem;min-height:1.25em}",
  ".wdpr-lightbox button{cursor:pointer;border:0;border-radius:3px;background:rgba(255,255,255,0.15);color:#fff;font-size:1.5rem;line-height:1;padding:0.25em 0.5em}",
  ".wdpr-lightbox button:hover{background:rgba(255,255,255,0.35)}",
  ".wdpr-lightbox-close{position:absolute;top:-2.25rem;right:0}",
].join("\n");

interface StyleOwnership {
  count: number;
  /** The style node this runtime created, or null when the host page
   * already provided one with the same id (never removed by us). */
  owned: HTMLStyleElement | null;
}

/** Per-document refcount and ownership for the injected stylesheet. */
const styleRefCounts = new Map<Document, StyleOwnership>();

function acquireStyles(doc: Document): void {
  const entry = styleRefCounts.get(doc);
  if (entry) {
    entry.count++;
    return;
  }

  let owned: HTMLStyleElement | null = null;
  if (!doc.getElementById(STYLE_ID)) {
    owned = doc.createElement("style");
    owned.id = STYLE_ID;
    owned.textContent = STYLE_TEXT;
    doc.head.appendChild(owned);
  }
  styleRefCounts.set(doc, { count: 1, owned });
}

function releaseStyles(doc: Document): void {
  const entry = styleRefCounts.get(doc);
  if (!entry) return;
  if (entry.count <= 1) {
    styleRefCounts.delete(doc);
    entry.owned?.remove();
  } else {
    entry.count--;
  }
}

function supportsDialog(doc: Document): boolean {
  const win = doc.defaultView;
  if (!win) return false;
  const ctor: unknown = (win as unknown as Record<string, unknown>).HTMLDialogElement;
  if (typeof ctor !== "function") return false;
  const proto = (ctor as { prototype?: Record<string, unknown> }).prototype;
  return typeof proto?.showModal === "function";
}

interface LightboxParts {
  dialog: HTMLDialogElement;
  image: HTMLImageElement;
  caption: HTMLElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
}

function buildLightbox(doc: Document): LightboxParts {
  const dialog = doc.createElement("dialog") as HTMLDialogElement;
  dialog.className = "wdpr-lightbox";

  const close = doc.createElement("button");
  close.type = "button";
  close.className = "wdpr-lightbox-close";
  close.setAttribute("aria-label", "Close");
  close.textContent = "×";

  const prev = doc.createElement("button");
  prev.type = "button";
  prev.className = "wdpr-lightbox-prev";
  prev.setAttribute("aria-label", "Previous image");
  prev.textContent = "‹";

  const next = doc.createElement("button");
  next.type = "button";
  next.className = "wdpr-lightbox-next";
  next.setAttribute("aria-label", "Next image");
  next.textContent = "›";

  const figure = doc.createElement("figure");
  figure.className = "wdpr-lightbox-figure";
  const image = doc.createElement("img");
  const caption = doc.createElement("figcaption");
  caption.className = "wdpr-lightbox-caption";
  figure.append(image, caption);

  const body = doc.createElement("div");
  body.className = "wdpr-lightbox-body";
  body.append(prev, figure, next);

  dialog.append(close, body);
  close.addEventListener("click", () => dialog.close());

  return { dialog, image, caption, prev, next };
}

/**
 * Initialize gallery lightbox behavior within the given root element.
 *
 * @param root - The root DOM element containing rendered Wikidot markup.
 * @returns A cleanup handle whose `destroy()` method removes listeners,
 *   the dialog element, and the injected stylesheet.
 */
export function initGallery(root: HTMLElement): ModuleCleanup {
  const doc = root.ownerDocument;
  if (!supportsDialog(doc)) {
    return { destroy() {} };
  }

  acquireStyles(doc);

  let parts: LightboxParts | null = null;
  let anchors: HTMLAnchorElement[] = [];
  let index = 0;
  let opener: HTMLElement | null = null;

  function show(i: number): void {
    if (!parts || anchors.length === 0) return;
    index = (i + anchors.length) % anchors.length;
    const anchor = anchors[index]!;
    parts.image.src = anchor.href;
    const alt = anchor.querySelector("img")?.getAttribute("alt") ?? "";
    parts.image.alt = alt;
    parts.caption.textContent = alt;
    const single = anchors.length < 2;
    parts.prev.hidden = single;
    parts.next.hidden = single;
  }

  function ensureParts(): LightboxParts {
    if (parts) return parts;
    parts = buildLightbox(doc);
    parts.prev.addEventListener("click", () => show(index - 1));
    parts.next.addEventListener("click", () => show(index + 1));
    parts.dialog.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") show(index - 1);
      else if (e.key === "ArrowRight") show(index + 1);
    });
    // A click on the dialog element itself (outside the content) is a
    // backdrop click.
    parts.dialog.addEventListener("click", (e: Event) => {
      if (e.target === parts?.dialog) parts.dialog.close();
    });
    parts.dialog.addEventListener("close", () => {
      opener?.focus();
      opener = null;
    });
    doc.body.appendChild(parts.dialog);
    return parts;
  }

  function handleClick(e: Event): void {
    const target = e.target;
    if (!isElement(target)) return;
    const link = target.closest<HTMLAnchorElement>(".gallery-box a.with-lb");
    if (!link) return;
    const box = link.closest<HTMLElement>(".gallery-box");
    if (!box || box.getAttribute("data-viewer") === "false") return;

    e.preventDefault();
    anchors = Array.from(box.querySelectorAll<HTMLAnchorElement>("a.with-lb"));
    opener = link;
    ensureParts();
    show(Math.max(0, anchors.indexOf(link)));
    parts!.dialog.showModal();
  }

  root.addEventListener("click", handleClick);

  return {
    destroy() {
      root.removeEventListener("click", handleClick);
      if (parts) {
        if (parts.dialog.open) parts.dialog.close();
        parts.dialog.remove();
        parts = null;
      }
      releaseStyles(doc);
    },
  };
}
