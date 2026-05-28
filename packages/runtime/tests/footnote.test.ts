import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

/**
 * Regression coverage for footnote tooltip positioning on narrow
 * (mobile) viewports.
 *
 * happy-dom has no layout engine, so `getBoundingClientRect()` returns
 * zeros by default. We stub the anchor's and tooltip's rects, and the
 * window's `innerWidth`, to drive the clamp logic in `initFootnote`'s
 * `positionTooltip` deterministically.
 */
describe("footnote tooltip positioning", () => {
  let happyWindow: Window;
  let doc: Document;
  let root: HTMLElement;
  let originalWindow: typeof globalThis.window | undefined;
  let originalNode: unknown;

  beforeEach(() => {
    happyWindow = new Window();
    doc = happyWindow.document as unknown as Document;
    root = doc.createElement("div");
    doc.body.appendChild(root);
    originalWindow = globalThis.window;
    // @ts-expect-error - assign happy-dom window to global
    globalThis.window = happyWindow;
    // The source uses the global `Node` constant (browser global);
    // expose happy-dom's so `Node.TEXT_NODE` resolves under the test.
    originalNode = (globalThis as { Node?: unknown }).Node;
    (globalThis as { Node?: unknown }).Node = happyWindow.Node;
  });

  afterEach(() => {
    if (originalWindow !== undefined) {
      globalThis.window = originalWindow;
    }
    (globalThis as { Node?: unknown }).Node = originalNode;
  });

  /** Force `window.innerWidth` (happy-dom defaults to 1024). */
  function setViewportWidth(width: number): void {
    Object.defineProperty(happyWindow, "innerWidth", {
      value: width,
      configurable: true,
    });
  }

  /** Stub an element's bounding rect with the given left/width. */
  function stubRect(el: Element, rect: Partial<DOMRect>): void {
    el.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        ...rect,
      }) as DOMRect;
  }

  test("caps tooltip max-width to the viewport on a narrow screen", async () => {
    const { initFootnote } = await import("../src/footnote");

    // 320px-wide mobile viewport
    setViewportWidth(320);

    root.innerHTML =
      `Body<sup class="footnoteref">` +
      `<a id="footnoteref-1" href="#footnote-1" class="footnoteref">1</a></sup>` +
      `<div class="footnotes-footer">` +
      `<div class="footnote-footer" id="footnote-1">` +
      `<a href="javascript:;">1</a>. ${"long ".repeat(80)}</div></div>`;

    const cleanup = initFootnote(root);

    const fref = root.querySelector<HTMLAnchorElement>("a.footnoteref")!;
    stubRect(fref, { left: 300, right: 310, bottom: 20, top: 10, width: 10, height: 10 });

    const tip = doc.getElementById("odialog-hovertips")!.querySelector<HTMLElement>(".hovertip")!;
    stubRect(tip, { width: 300, height: 100 });

    fref.dispatchEvent(
      new happyWindow.MouseEvent("mouseenter", { bubbles: true }) as unknown as Event,
    );

    // Width is capped to the viewport minus the two margins.
    expect(tip.style.maxWidth).toBe(`${320 - 8 * 2}px`);

    cleanup.destroy();
  });

  test("clamps left to the margin when the right-edge clamp would go negative", async () => {
    const { initFootnote } = await import("../src/footnote");

    // 320px-wide mobile viewport. With a measured tooltip wider than
    // `innerWidth - 2*margin` (= 304), the right-edge clamp alone yields
    // `left = 320 - 318 - 8 = -6`, which would bleed off the left edge.
    // The left-edge clamp must pull it back to the margin.
    setViewportWidth(320);

    root.innerHTML =
      `Body<sup class="footnoteref">` +
      `<a id="footnoteref-1" href="#footnote-1" class="footnoteref">1</a></sup>` +
      `<div class="footnotes-footer">` +
      `<div class="footnote-footer" id="footnote-1">` +
      `<a href="javascript:;">1</a>. ${"long ".repeat(80)}</div></div>`;

    const cleanup = initFootnote(root);

    const fref = root.querySelector<HTMLAnchorElement>("a.footnoteref")!;
    stubRect(fref, { left: 300, right: 310, bottom: 20, top: 10, width: 10, height: 10 });

    const tip = doc.getElementById("odialog-hovertips")!.querySelector<HTMLElement>(".hovertip")!;
    // Wider than innerWidth - 2*margin so the right-edge clamp underflows.
    stubRect(tip, { width: 318, height: 100 });

    fref.dispatchEvent(
      new happyWindow.MouseEvent("mouseenter", { bubbles: true }) as unknown as Event,
    );

    const margin = 8;
    // Left edge pinned to the margin (without the fix this would be -6).
    expect(parseFloat(tip.style.left)).toBe(margin);

    cleanup.destroy();
  });

  test("does not over-constrain on a wide screen", async () => {
    const { initFootnote } = await import("../src/footnote");

    setViewportWidth(1200);

    root.innerHTML =
      `Body<sup class="footnoteref">` +
      `<a id="footnoteref-1" href="#footnote-1" class="footnoteref">1</a></sup>` +
      `<div class="footnotes-footer">` +
      `<div class="footnote-footer" id="footnote-1"><a href="javascript:;">1</a>. short</div></div>`;

    const cleanup = initFootnote(root);

    const fref = root.querySelector<HTMLAnchorElement>("a.footnoteref")!;
    stubRect(fref, { left: 100, right: 110, bottom: 20, top: 10, width: 10, height: 10 });

    const tip = doc.getElementById("odialog-hovertips")!.querySelector<HTMLElement>(".hovertip")!;
    stubRect(tip, { width: 200, height: 80 });

    fref.dispatchEvent(
      new happyWindow.MouseEvent("mouseenter", { bubbles: true }) as unknown as Event,
    );

    // Anchored at its natural left position (100); fits without clamping.
    expect(parseFloat(tip.style.left)).toBe(100);

    cleanup.destroy();
  });
});
