import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { HTML_BLOCK_RESIZE_SCRIPT } from "../src/html-block";

describe("html-block resize", () => {
  let happyWindow: Window;
  let happyDocument: Document;
  let root: HTMLElement;
  let originalWindow: typeof globalThis.window | undefined;

  beforeEach(() => {
    happyWindow = new Window();
    happyDocument = happyWindow.document as unknown as Document;
    root = happyDocument.createElement("div");
    happyDocument.body.appendChild(root);

    // Save original window and set happy-dom window as global
    originalWindow = globalThis.window;
    // @ts-expect-error - assigning happy-dom window to global
    globalThis.window = happyWindow;
  });

  afterEach(() => {
    // Restore original window
    if (originalWindow !== undefined) {
      globalThis.window = originalWindow;
    }
  });

  test("resizes iframe on postMessage", async () => {
    // Dynamic import after setting up global window
    const { initHtmlBlockResize } = await import("../src/html-block");

    root.innerHTML = `<iframe class="html-block-iframe" src="/test"></iframe>`;
    const iframe = root.querySelector<HTMLIFrameElement>("iframe")!;

    const cleanup = initHtmlBlockResize(root);

    // Simulate postMessage from iframe
    const event = new happyWindow.MessageEvent("message", {
      data: { type: "wdpr-html-block-resize", height: 300 },
      source: iframe.contentWindow,
    });
    happyWindow.dispatchEvent(event);

    expect(iframe.style.height).toBe("300px");

    cleanup.destroy();
  });

  test("ignores invalid message format", async () => {
    const { initHtmlBlockResize } = await import("../src/html-block");

    root.innerHTML = `<iframe class="html-block-iframe" src="/test"></iframe>`;
    const iframe = root.querySelector<HTMLIFrameElement>("iframe")!;

    const cleanup = initHtmlBlockResize(root);

    // Invalid message type
    const event1 = new happyWindow.MessageEvent("message", {
      data: { type: "other-message", height: 500 },
      source: iframe.contentWindow,
    });
    happyWindow.dispatchEvent(event1);

    expect(iframe.style.height).toBe("");

    // Missing height
    const event2 = new happyWindow.MessageEvent("message", {
      data: { type: "wdpr-html-block-resize" },
      source: iframe.contentWindow,
    });
    happyWindow.dispatchEvent(event2);

    expect(iframe.style.height).toBe("");

    cleanup.destroy();
  });

  test("rejects excessively large height values", async () => {
    const { initHtmlBlockResize } = await import("../src/html-block");

    root.innerHTML = `<iframe class="html-block-iframe" src="/test"></iframe>`;
    const iframe = root.querySelector<HTMLIFrameElement>("iframe")!;

    const cleanup = initHtmlBlockResize(root);

    // Height exceeding MAX_HEIGHT (100000)
    const event1 = new happyWindow.MessageEvent("message", {
      data: { type: "wdpr-html-block-resize", height: 999999999 },
      source: iframe.contentWindow,
    });
    happyWindow.dispatchEvent(event1);
    expect(iframe.style.height).toBe("");

    // Negative height
    const event2 = new happyWindow.MessageEvent("message", {
      data: { type: "wdpr-html-block-resize", height: -100 },
      source: iframe.contentWindow,
    });
    happyWindow.dispatchEvent(event2);
    expect(iframe.style.height).toBe("");

    // Infinity
    const event3 = new happyWindow.MessageEvent("message", {
      data: { type: "wdpr-html-block-resize", height: Infinity },
      source: iframe.contentWindow,
    });
    happyWindow.dispatchEvent(event3);
    expect(iframe.style.height).toBe("");

    // NaN
    const event4 = new happyWindow.MessageEvent("message", {
      data: { type: "wdpr-html-block-resize", height: NaN },
      source: iframe.contentWindow,
    });
    happyWindow.dispatchEvent(event4);
    expect(iframe.style.height).toBe("");

    // Valid height at boundary
    const event5 = new happyWindow.MessageEvent("message", {
      data: { type: "wdpr-html-block-resize", height: 100000 },
      source: iframe.contentWindow,
    });
    happyWindow.dispatchEvent(event5);
    expect(iframe.style.height).toBe("100000px");

    cleanup.destroy();
  });

  test("ignores message from unknown source", async () => {
    const { initHtmlBlockResize } = await import("../src/html-block");

    root.innerHTML = `<iframe class="html-block-iframe" src="/test"></iframe>`;
    const iframe = root.querySelector<HTMLIFrameElement>("iframe")!;

    const cleanup = initHtmlBlockResize(root);

    // Message from different source (null simulates different window)
    const event = new happyWindow.MessageEvent("message", {
      data: { type: "wdpr-html-block-resize", height: 400 },
      source: null,
    });
    happyWindow.dispatchEvent(event);

    expect(iframe.style.height).toBe("");

    cleanup.destroy();
  });

  test("destroy removes listener", async () => {
    const { initHtmlBlockResize } = await import("../src/html-block");

    root.innerHTML = `<iframe class="html-block-iframe" src="/test"></iframe>`;
    const iframe = root.querySelector<HTMLIFrameElement>("iframe")!;

    const cleanup = initHtmlBlockResize(root);
    cleanup.destroy();

    const event = new happyWindow.MessageEvent("message", {
      data: { type: "wdpr-html-block-resize", height: 300 },
      source: iframe.contentWindow,
    });
    happyWindow.dispatchEvent(event);

    expect(iframe.style.height).toBe("");
  });

  test("HTML_BLOCK_RESIZE_SCRIPT is valid JavaScript", () => {
    // Script should be syntactically valid
    expect(() => new Function(HTML_BLOCK_RESIZE_SCRIPT)).not.toThrow();
  });

  test("HTML_BLOCK_RESIZE_SCRIPT contains expected message type", () => {
    expect(HTML_BLOCK_RESIZE_SCRIPT).toContain("wdpr-html-block-resize");
    expect(HTML_BLOCK_RESIZE_SCRIPT).toContain("postMessage");
    expect(HTML_BLOCK_RESIZE_SCRIPT).toContain("ResizeObserver");
  });
});
