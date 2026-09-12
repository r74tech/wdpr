import type { RatingRef, RatingAction, RatingState } from "./rating";
export type { RatingRef, RatingVote, RatingAction, RatingAggregate, RatingState } from "./rating";

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
   * Submit an action on the displayed page's Rate or CustomRate. The host must
   * bind the page, revalidate registration, include-expanded declarations and permissions,
   * and persist the action.
   * Return updated viewer state, or null to withdraw the widget. Reject to show
   * a retryable error. Neutral voting (value 0) and cancellation are distinct.
   */
  onRate?: (ref: RatingRef, action: RatingAction) => Promise<RatingState | null>;

  /**
   * Called when a user clicks the `[[module Join]]` button to
   * request membership in the site.
   */
  onJoin?: () => Promise<void>;

  /** Handle a standalone page-option button. The host owns permissions and UI. */
  onPageAction?: (action: string) => void | Promise<void>;
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
