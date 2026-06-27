/** A single highlighted token with its CSS class and text content. */
export interface HighlightToken {
  /** CSS class name suffix (used as `hl-{class}`). */
  class: string;
  /** The literal text content of this token. */
  content: string;
}
