/**
 * @module join/types
 *
 * Type definitions for the Join module.
 *
 * The `[[module Join]]` block renders a "Join this site" button that allows
 * visitors to apply for site membership.
 */

/**
 * AST data for a `[[module Join]]` element.
 *
 * The rendering application should display a membership application button
 * with the specified text.
 */
export interface JoinModuleData {
  module: "join";
  /** Custom button text, or null to use the default "Join this Site" text */
  "button-text": string | null;
  /** Additional attributes passed to the module */
  attributes: Record<string, string>;
}
