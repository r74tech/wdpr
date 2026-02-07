/**
 * Shared callback interface for module resolution.
 *
 * {@link DataProvider} is the single object that callers pass to
 * {@link resolveModules} to supply external data. Each property is an
 * optional async callback; if omitted the corresponding module type is
 * left unresolved in the AST.
 *
 * Include resolution uses a separate API ({@link resolveIncludes})
 * because it operates on raw wikitext before parsing, not on AST nodes.
 *
 * @module
 */

import type { ListPagesDataFetcher } from "./listpages/types";
import type { ListUsersDataFetcher } from "./listusers/types";
import type { IfTagsResolver } from "./iftags/types";

/**
 * Callback bag for supplying external data during module resolution.
 *
 * Pass an instance to {@link resolveModules}. Every callback is optional:
 * when a callback is missing the corresponding module node is kept as-is
 * in the output AST — useful when you only need to resolve a subset of
 * modules (e.g. only `[[iftags]]` on the client side).
 *
 * @group Module Resolution
 */
export interface DataProvider {
  /**
   * Fetch page data for `[[module ListPages]]` expansion.
   *
   * Called once per ListPages instance in the AST with the normalised
   * query parameters extracted from the module's wikitext attributes.
   *
   * @security The query fields originate from **untrusted user input**.
   * When building database queries from the returned requirement:
   * - **Never** interpolate `req.query` / `req.rawAttributes` into SQL
   * - **Always** use parameterised queries or prepared statements
   * - For `order` (ORDER BY), validate against a whitelist of column names
   */
  fetchListPages?: ListPagesDataFetcher;

  /**
   * Fetch user data for `[[module ListUsers]]` expansion.
   *
   * Called once per ListUsers instance with the parsed query parameters.
   */
  fetchListUsers?: ListUsersDataFetcher;

  /**
   * Return the current page's tags for `[[iftags]]` evaluation.
   *
   * If provided, `[[iftags]]` blocks are evaluated and either kept or
   * discarded based on whether the page's tags satisfy the condition.
   * If omitted, `[[iftags]]` blocks pass through unresolved.
   */
  getPageTags?: IfTagsResolver;
}
