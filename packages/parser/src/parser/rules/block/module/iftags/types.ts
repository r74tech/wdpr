/**
 *
 * Type definitions for the IfTags conditional rendering module.
 *
 * `[[iftags]]` is a Wikidot block that conditionally renders its content
 * based on the current page's tags. The condition syntax supports required
 * tags (`+tag`), forbidden tags (`-tag`), and optional tags (bare `tag`).
 *
 * @module
 */

/**
 * Parsed representation of an `[[iftags +tag -tag ...]]` condition.
 *
 * The condition string is parsed into three arrays:
 * - `required` tags must ALL be present on the page (AND logic, `+tag` syntax)
 * - `forbidden` tags must ALL be absent from the page (AND logic, `-tag` syntax)
 * - `optional` tags require at least ONE to be present (OR logic, bare `tag` syntax)
 *
 * All three categories must independently be satisfied.
 *
 * @example
 * `[[iftags +fruit -admin component template]]` parses to:
 * ```
 * { required: ["fruit"], forbidden: ["admin"], optional: ["component", "template"] }
 * ```
 */
export interface TagCondition {
  /** Tags that must all be present on the page (`+tag` syntax) */
  required: string[];

  /** Tags that must all be absent from the page (`-tag` syntax) */
  forbidden: string[];

  /** Tags where at least one must be present (bare `tag` syntax, OR logic) */
  optional: string[];

  /**
   * `true` when the condition contained a bare `+` token (a `+` prefix with
   * no tag name). Wikidot treats `+` alone as "require an unnamed tag",
   * which can never be satisfied, so a `+`-only condition evaluates to
   * `false` (Hide Always).
   */
  hasEmptyRequired?: boolean;

  /**
   * `true` when the condition contained a bare `-` token (a `-` prefix with
   * no tag name). Wikidot treats `-` alone as "forbid nothing", which is
   * trivially satisfied — so a `-`-only condition evaluates to `true`
   * (Show Always).
   */
  hasEmptyForbidden?: boolean;
}

/**
 * Callback to retrieve the current page's tags during the resolve phase.
 *
 * Called when evaluating `[[iftags]]` conditions. The application must provide
 * this callback with access to the current page's tag list.
 *
 * @returns Array of tag names for the current page
 */
export type IfTagsResolver = () => string[];
