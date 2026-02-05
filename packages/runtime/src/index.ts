import { initBibcite } from "./bibcite";
import { initCollapsible } from "./collapsible";
import { initEmail } from "./email";
import { initFoldableList } from "./foldable-list";
import { initFootnote } from "./footnote";
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

/** Initialize the wdpr runtime, binding event listeners for interactive elements */
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
