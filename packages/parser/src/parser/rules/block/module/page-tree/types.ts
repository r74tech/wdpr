/**
 *
 * Type definitions for the PageTree module.
 *
 * The `[[module PageTree]]` block renders a hierarchical tree view of pages
 * based on parent-child relationships. It starts from a specified root page
 * (or the current page) and displays descendants up to a configurable depth.
 *
 * @module
 */

/**
 * AST data for a `[[module PageTree]]` element.
 *
 * The rendering application should build a tree of pages starting from the
 * root and display them as a nested list.
 */
export interface PageTreeModuleData {
  module: "page-tree";
  /** Root page to start the tree from, or null for the current page */
  root: string | null;
  /**
   * Whether to display the root page itself in the tree.
   * Note: Wikidot only accepts the string `"true"` for this attribute, not `"yes"`.
   */
  "show-root": boolean;
  /** Maximum depth of the tree, or null for unlimited depth */
  depth: number | null;
}
