import type { WikitextSettings } from "@wdprlib/ast";

/**
 * Configuration for the {@link Parser} and the {@link parse} function.
 *
 * All fields are optional; sensible defaults are applied when omitted.
 *
 * @group Parser
 */
export interface ParserOptions {
  /** Markup dialect. Currently only `"wikidot"` is supported. */
  version?: "wikidot";
  /**
   * Propagate source-position data into every AST node.
   * Defaults to `true`. Set to `false` for smaller output when positions
   * are not needed.
   */
  trackPositions?: boolean;
  /**
   * Context-dependent feature flags (page vs. forum-post, etc.).
   * Defaults to {@link DEFAULT_SETTINGS} (full page mode).
   */
  settings?: WikitextSettings;
  /**
   * Page tags consulted when expanding `[[iftags]]` directives that are
   * embedded inside another block's opener.
   *
   * Values:
   * - omitted / `undefined`: no preprocess pass.
   * - `null`: opener-embedded iftags only, evaluated as if the page has no tags.
   * - `string[]`: every iftags block is evaluated against the given tags eagerly.
   */
  pageTags?: string[] | null;
  /**
   * Append the implicit document-level footnote block when no explicit block
   * exists. Defaults to true. Fragment pipelines can disable this and add one
   * block after all fragments have been merged.
   */
  appendImplicitFootnoteBlock?: boolean;
}
