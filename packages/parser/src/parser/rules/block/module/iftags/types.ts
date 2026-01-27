/**
 * IfTags module types
 */

/**
 * Tag condition parsed from [[iftags +tag -tag ...]]
 *
 * Format:
 * - "+tag" means tag must be present
 * - "-tag" means tag must be absent
 * - "tag" (no prefix) means tag must be present
 */
export interface TagCondition {
  /** Tags that must be present */
  required: string[];

  /** Tags that must be absent */
  forbidden: string[];
}

/**
 * Callback to get current page's tags
 *
 * Called during resolve phase to evaluate [[iftags]] conditions.
 *
 * @returns Array of tag names for the current page
 */
export type IfTagsResolver = () => string[];
