/**
 * Configuration for `initWdprRuntime()`.
 *
 * @group Runtime
 */
export interface RuntimeOptions {
  /**
   * DOM element to scan for interactive Wikidot markup.
   * Defaults to `document.body` when omitted.
   */
  root?: HTMLElement;

  /**
   * Whether collapsible blocks use a CSS fade animation when
   * opening and closing. Defaults to `true`.
   */
  fade?: boolean;

  /**
   * Called when a user casts a vote in a `[[module Rate]]` widget.
   *
   * @param pageId - Identifier of the page being rated
   * @param points - Vote value (e.g. +1, -1, or 0 to cancel)
   * @returns Updated aggregate rating data
   */
  onRate?: (pageId: string, points: number) => Promise<RateResult>;

  /**
   * Called when a user clicks the `[[module Join]]` button to
   * request membership in the site.
   */
  onJoin?: () => Promise<void>;

  /** Handle a standalone page-option button. The host owns permissions and UI. */
  onPageAction?: (action: string) => void | Promise<void>;
}

/**
 * Aggregate rating data returned after a vote is submitted.
 *
 * @group Runtime
 */
export interface RateResult {
  /** Total accumulated points */
  points: number;
  /** Number of votes cast */
  votes: number;
  /** Percentage of positive votes (0–100) */
  percent: number;
}

/**
 * Handle returned by `initWdprRuntime()`.
 *
 * Call `destroy()` to remove every event listener and timer that the
 * runtime attached, preventing memory leaks on SPA navigation.
 *
 * @group Runtime
 */
export interface WdprRuntime {
  /** Remove all event listeners and release resources */
  destroy(): void;
}

/**
 * Internal cleanup handle for a single runtime module.
 * @internal
 */
export interface ModuleCleanup {
  destroy(): void;
}
