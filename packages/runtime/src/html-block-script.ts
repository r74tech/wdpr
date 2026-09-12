/** Script injected into HTML block iframes to notify the parent of content height changes. */
export const HTML_BLOCK_RESIZE_SCRIPT = `(function(){
  function notifyHeight() {
    // scrollHeight includes the viewport height; adding padding creates a resize feedback loop.
    var height = document.documentElement.scrollHeight || document.body.scrollHeight;
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
