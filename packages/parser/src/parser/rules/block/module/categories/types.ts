/**
 * @module categories/types
 *
 * Type definitions for the Categories module.
 *
 * The `[[module Categories]]` block displays a list of page categories
 * on the current site.
 */

/**
 * AST data for a `[[module Categories]]` element.
 *
 * The rendering application should query the site's category list and
 * display them, optionally including hidden categories.
 */
export interface CategoriesModuleData {
  module: "categories";
  /** Whether to include hidden categories (prefixed with `_`) in the listing */
  "include-hidden": boolean;
}
