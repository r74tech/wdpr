/**
 * Browser-side runtime for Wikidot rendered HTML.
 *
 * After `@wdprlib/render` produces static HTML, this package brings it
 * to life by attaching event listeners for interactive elements:
 * collapsibles, tab views, table-of-contents scrolling, footnote
 * back-references, rating widgets, etc.
 *
 * ```ts
 * import { initWdprRuntime } from "@wdprlib/runtime";
 *
 * const runtime = initWdprRuntime({ root: document.getElementById("content")! });
 * // later, to clean up:
 * runtime.destroy();
 * ```
 *
 * @packageDocumentation
 */

import { initBibcite } from "./bibcite";
import { initCollapsible } from "./collapsible";
import { initEmail } from "./email";
import { initFoldableList } from "./foldable-list";
import { initFootnote } from "./footnote";
import { initGallery } from "./gallery";
import { initHtmlBlockResize } from "./html-block";
import { initMath } from "./math";
import { initJoin } from "./modules/join";
import { initRate } from "./modules/rate";
import { initOdate } from "./odate";
import { initTabview } from "./tabview";
import { initToc } from "./toc";
import type { ModuleCleanup, RuntimeOptions, WdprRuntime } from "./types";

export { HTML_BLOCK_RESIZE_SCRIPT } from "./html-block";
export type { RateResult, RuntimeOptions, WdprRuntime } from "./types";

/**
 * Initialise the wdpr runtime by scanning the DOM and binding event
 * listeners for all interactive Wikidot elements found under `root`.
 *
 * Returns a {@link WdprRuntime} handle whose `destroy()` method removes
 * every listener that was attached — call it before unmounting the
 * content (e.g. on SPA route changes) to avoid memory leaks.
 *
 * @param options - Configuration including root element and callbacks
 * @returns A handle with a `destroy()` cleanup method
 *
 * @group Runtime
 */
export function initWdprRuntime(options?: RuntimeOptions): WdprRuntime {
  const root = options?.root ?? document.body;
  const cleanups: ModuleCleanup[] = [];

  cleanups.push(initCollapsible(root, options));
  cleanups.push(initTabview(root));
  cleanups.push(initToc(root));
  cleanups.push(initFootnote(root));
  cleanups.push(initBibcite(root));
  cleanups.push(initFoldableList(root));
  cleanups.push(initRate(root, options));
  cleanups.push(initJoin(root, options));
  cleanups.push(initHtmlBlockResize(root));
  cleanups.push(initGallery(root));

  cleanups.push(initMath(root));

  initOdate(root);
  initEmail(root);

  return {
    destroy() {
      for (const cleanup of cleanups) {
        cleanup.destroy();
      }
    },
  };
}
