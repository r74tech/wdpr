import { beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { initGallery } from "../src/gallery";

const STYLE_ID = "wdpr-gallery-lightbox-style";

function galleryHtml(options: { viewer?: boolean } = {}): string {
  const viewerAttr = options.viewer === false ? ' data-viewer="false"' : "";
  return `
    <div class="gallery-box" data-size="thumbnail"${viewerAttr}>
      <figure class="gallery-item thumbnail">
        <a href="/local--files/p/a.jpg" class="with-lb"><img src="/r/a.jpg" alt="First"/></a>
      </figure>
      <figure class="gallery-item thumbnail">
        <a href="/local--files/p/b.jpg" class="with-lb"><img src="/r/b.jpg" alt=""/></a>
      </figure>
      <figure class="gallery-item thumbnail">
        <a href="/ext" target="_blank" rel="noopener"><img src="/r/c.jpg" alt="Linked"/></a>
      </figure>
    </div>
  `;
}

describe("gallery lightbox", () => {
  let window: Window;
  let document: Document;
  let root: HTMLElement;

  beforeEach(() => {
    window = new Window();
    document = window.document as unknown as Document;
    root = document.createElement("div");
    document.body.appendChild(root);
  });

  function dialog(): HTMLDialogElement | null {
    return document.querySelector("dialog.wdpr-lightbox");
  }

  function clickAnchor(i: number): void {
    root.querySelectorAll<HTMLElement>("a.with-lb")[i]!.click();
  }

  test("opens the dialog on a with-lb click with image and caption", () => {
    root.innerHTML = galleryHtml();
    const cleanup = initGallery(root);

    clickAnchor(0);

    const dlg = dialog()!;
    expect(dlg.open).toBe(true);
    const img = dlg.querySelector("img")!;
    expect(img.getAttribute("src")).toContain("/local--files/p/a.jpg");
    expect(img.getAttribute("alt")).toBe("First");
    expect(dlg.querySelector("figcaption")!.textContent).toBe("First");

    cleanup.destroy();
  });

  test("navigates with prev/next and wraps at the ends", () => {
    root.innerHTML = galleryHtml();
    const cleanup = initGallery(root);

    clickAnchor(0);
    const dlg = dialog()!;
    const next = dlg.querySelector<HTMLButtonElement>(".wdpr-lightbox-next")!;
    const prev = dlg.querySelector<HTMLButtonElement>(".wdpr-lightbox-prev")!;
    const img = dlg.querySelector("img")!;

    next.click();
    expect(img.getAttribute("src")).toContain("/local--files/p/b.jpg");
    // only two with-lb anchors: wrap back to the first
    next.click();
    expect(img.getAttribute("src")).toContain("/local--files/p/a.jpg");
    prev.click();
    expect(img.getAttribute("src")).toContain("/local--files/p/b.jpg");

    cleanup.destroy();
  });

  test("navigates with arrow keys", () => {
    root.innerHTML = galleryHtml();
    const cleanup = initGallery(root);

    clickAnchor(0);
    const dlg = dialog()!;
    dlg.dispatchEvent(
      new (window as unknown as { KeyboardEvent: typeof KeyboardEvent }).KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
      }),
    );
    expect(dlg.querySelector("img")!.getAttribute("src")).toContain("/local--files/p/b.jpg");

    cleanup.destroy();
  });

  test("ignores anchors without with-lb and disabled viewers", () => {
    root.innerHTML = galleryHtml() + galleryHtml({ viewer: false });
    const cleanup = initGallery(root);

    // the target=_blank anchor is not a lightbox target
    root.querySelectorAll<HTMLElement>('a[target="_blank"]')[0]!.click();
    expect(dialog()).toBeNull();

    // with-lb inside a data-viewer="false" box does nothing
    const disabledBox = root.querySelectorAll(".gallery-box")[1]!;
    disabledBox.querySelector<HTMLElement>("a.with-lb")!.click();
    expect(dialog()).toBeNull();

    cleanup.destroy();
  });

  test("hides prev/next for a single-image gallery", () => {
    root.innerHTML = `
      <div class="gallery-box" data-size="thumbnail">
        <figure class="gallery-item thumbnail">
          <a href="/local--files/p/only.jpg" class="with-lb"><img src="/r/only.jpg" alt=""/></a>
        </figure>
      </div>
    `;
    const cleanup = initGallery(root);

    clickAnchor(0);
    const dlg = dialog()!;
    expect(dlg.querySelector<HTMLButtonElement>(".wdpr-lightbox-prev")!.hidden).toBe(true);
    expect(dlg.querySelector<HTMLButtonElement>(".wdpr-lightbox-next")!.hidden).toBe(true);

    cleanup.destroy();
  });

  test("close button closes the dialog", () => {
    root.innerHTML = galleryHtml();
    const cleanup = initGallery(root);

    clickAnchor(0);
    const dlg = dialog()!;
    dlg.querySelector<HTMLButtonElement>(".wdpr-lightbox-close")!.click();
    expect(dlg.open).toBe(false);

    cleanup.destroy();
  });

  test("injects the stylesheet once and refcounts it across instances", () => {
    root.innerHTML = galleryHtml();
    const a = initGallery(root);
    const b = initGallery(root);

    expect(document.querySelectorAll(`#${STYLE_ID}`).length).toBe(1);
    expect(document.getElementById(STYLE_ID)!.textContent).toContain(
      '.gallery-box[data-size="medium"]',
    );
    expect(document.getElementById(STYLE_ID)!.textContent).toContain(".gallery-box>.gallery-item");
    expect(document.getElementById(STYLE_ID)!.textContent).toContain("width:auto;max-width:100%");
    expect(document.getElementById(STYLE_ID)!.textContent).toContain("height:auto");
    expect(document.getElementById(STYLE_ID)!.textContent).toContain("max-height:500px");

    a.destroy();
    expect(document.getElementById(STYLE_ID)).not.toBeNull();
    b.destroy();
    expect(document.getElementById(STYLE_ID)).toBeNull();
  });

  test("does not remove a host-provided stylesheet with the same id", () => {
    const hostStyle = document.createElement("style");
    hostStyle.id = STYLE_ID;
    hostStyle.textContent = ".custom{}";
    document.head.appendChild(hostStyle);

    root.innerHTML = galleryHtml();
    const cleanup = initGallery(root);
    cleanup.destroy();

    expect(document.getElementById(STYLE_ID)).not.toBeNull();
    expect(document.getElementById(STYLE_ID)!.textContent).toBe(".custom{}");
    hostStyle.remove();
  });

  test("destroy removes the dialog and the click listener", () => {
    root.innerHTML = galleryHtml();
    const cleanup = initGallery(root);

    clickAnchor(0);
    expect(dialog()).not.toBeNull();

    cleanup.destroy();
    expect(dialog()).toBeNull();

    clickAnchor(0);
    expect(dialog()).toBeNull();
  });
});
