import type { ModuleCleanup } from "./types";

/** Message format for iframe resize communication */
interface HtmlBlockResizeMessage {
  type: "wdpr-html-block-resize";
  height: number;
}

// Maximum allowed height to prevent UI disruption attacks
const MAX_HEIGHT = 100000;

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

/** Initialize htmlBlock iframe auto-resize via postMessage */
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

/**
 * Script to inject into htmlBlock iframe content.
 * This should be included in the HTML served for htmlBlock iframes.
 *
 * Usage: Wrap htmlBlock content like this:
 * ```html
 * <!DOCTYPE html>
 * <html>
 * <head><script>${HTML_BLOCK_RESIZE_SCRIPT}</script></head>
 * <body>${htmlBlockContent}</body>
 * </html>
 * ```
 */
export const HTML_BLOCK_RESIZE_SCRIPT = `(function(){
  function notifyHeight() {
    var height = (document.documentElement.scrollHeight || document.body.scrollHeight) + 2;
    parent.postMessage({ type: 'wdpr-html-block-resize', height: height }, '*');
  }
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(notifyHeight).observe(document.body);
  } else {
    setInterval(notifyHeight, 250);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', notifyHeight);
  } else {
    notifyHeight();
  }
  window.addEventListener('load', notifyHeight);
})();`;
