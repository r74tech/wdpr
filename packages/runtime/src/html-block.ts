/**
 *
 * Runtime module for auto-resizing `[[html]]` block iframes.
 *
 * HTML blocks are rendered as iframes. This module listens for
 * `postMessage` events from those iframes and adjusts the iframe's
 * height to match its content, eliminating scrollbars.
 *
 * The communication protocol uses a typed message with
 * `type: "wdpr-html-block-resize"` and a numeric `height` field.
 * DOM interactions:
 * - Listens for `message` events on `window`
 * - Matches `e.source` against `iframe.html-block-iframe` elements in the root
 * - Sets `iframe.style.height` to the reported content height
 *
 * The `destroy()` cleanup function removes the message listener.
 *
 * @module
 */

import type { ModuleCleanup } from "./types";

/** Message format for iframe-to-parent resize communication. */
interface HtmlBlockResizeMessage {
  type: "wdpr-html-block-resize";
  height: number;
}

/** Maximum allowed iframe height (in pixels) to prevent UI disruption attacks. */
const MAX_HEIGHT = 100000;

/**
 * Type guard that validates a `postMessage` payload as a valid resize message.
 *
 * Rejects negative, NaN, Infinity, and excessively large height values
 * to prevent malicious iframes from disrupting the page layout.
 *
 * @param data - The `event.data` payload from a `message` event.
 * @returns `true` if the data is a valid `HtmlBlockResizeMessage`.
 */
function isResizeMessage(data: unknown): data is HtmlBlockResizeMessage {
  if (
    typeof data !== "object" ||
    data === null ||
    (data as HtmlBlockResizeMessage).type !== "wdpr-html-block-resize" ||
    typeof (data as HtmlBlockResizeMessage).height !== "number"
  ) {
    return false;
  }
  const height = (data as HtmlBlockResizeMessage).height;
  // Reject negative, NaN, Infinity, or excessively large values
  return Number.isFinite(height) && height >= 0 && height <= MAX_HEIGHT;
}

/**
 * Initialize auto-resize for `[[html]]` block iframes via `postMessage`.
 *
 * Listens for `message` events on the `window` and matches each event's
 * `source` against the `iframe.html-block-iframe` elements within the root.
 * When a valid resize message is received from a matching iframe, the
 * iframe's height is updated.
 *
 * @param root - The root DOM element containing rendered Wikidot markup.
 * @returns A cleanup handle whose `destroy()` method removes the message listener.
 */
export function initHtmlBlockResize(root: HTMLElement): ModuleCleanup {
  function handleMessage(e: MessageEvent): void {
    if (!isResizeMessage(e.data)) return;

    // Find the iframe that sent this message
    const iframes = root.querySelectorAll<HTMLIFrameElement>("iframe.html-block-iframe");
    for (const iframe of iframes) {
      if (iframe.contentWindow === e.source) {
        iframe.style.height = `${e.data.height}px`;
        break;
      }
    }
  }

  window.addEventListener("message", handleMessage);

  return {
    destroy() {
      window.removeEventListener("message", handleMessage);
    },
  };
}
