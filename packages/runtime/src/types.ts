export interface RuntimeOptions {
  /** Root element to bind event listeners (default: document.body) */
  root?: HTMLElement;

  /** Use fade animation for collapsible open/close (default: true) */
  fade?: boolean;

  /** Callback when user votes on a page rate widget */
  onRate?: (pageId: string, points: number) => Promise<RateResult>;

  /** Callback when user clicks a join button */
  onJoin?: () => Promise<void>;
}

export interface RateResult {
  points: number;
  votes: number;
  percent: number;
}

export interface WdprRuntime {
  /** Remove all event listeners and clean up */
  destroy(): void;
}

export interface ModuleCleanup {
  destroy(): void;
}
