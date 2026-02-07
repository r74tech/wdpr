/**
 *
 * Type definitions for the Rate module.
 *
 * The `[[module Rate]]` block renders a page rating widget (upvote/downvote buttons).
 * It takes no attributes and has no body.
 *
 * @module
 */

/**
 * AST data for a `[[module Rate]]` element.
 *
 * This module has no configurable properties. The rendering application
 * is responsible for displaying the appropriate rating widget.
 */
export interface RateModuleData {
  module: "rate";
}
