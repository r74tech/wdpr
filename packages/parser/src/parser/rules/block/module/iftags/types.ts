/**
 *
 * Type definitions for the IfTags conditional rendering module.
 *
 * `[[iftags]]` is a Wikidot block that conditionally renders its content
 * based on the current page's tags. The condition syntax supports required
 * tags (`+tag` or bare `tag`) and forbidden tags (`-tag`).
 *
 * @module
 */

/**
 * Parsed representation of an `[[iftags +tag -tag ...]]` condition.
 *
 * The condition string is parsed into two arrays:
 * - `required` tags must ALL be present on the page for the condition to match
 * - `forbidden` tags must ALL be absent from the page for the condition to match
 *
 * Both conditions must be satisfied simultaneously (AND logic).
 *
 * @example
 * `[[iftags +fruit -admin component]]` parses to:
 * ```
 * { required: ["fruit", "component"], forbidden: ["admin"] }
 * ```
 */
export interface TagCondition {
  /** Tags that must all be present on the page (`+tag` or bare `tag` syntax) */
  required: string[];

  /** Tags that must all be absent from the page (`-tag` syntax) */
  forbidden: string[];
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
