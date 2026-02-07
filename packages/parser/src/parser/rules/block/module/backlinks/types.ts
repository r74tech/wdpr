/**
 *
 * Type definitions for the Backlinks module.
 *
 * The `[[module Backlinks]]` block displays a list of pages that link to
 * the specified page (or the current page if no `page` attribute is given).
 *
 * @module
 */

/**
 * AST data for a `[[module Backlinks]]` element.
 *
 * The rendering application should query for pages that contain links to
 * the target page and display them as a list.
 */
export interface BacklinksModuleData {
  module: "backlinks";
  /** Target page for which to find backlinks, or null for the current page */
  page: string | null;
}
