/**
 * Common types for module resolution
 *
 * DataProvider is the main interface for external data callbacks.
 * Each module type (ListPages, IfTags) has its own fetcher type.
 */

import type { ListPagesDataFetcher } from "./listpages/types";
import type { ListUsersDataFetcher } from "./listusers/types";
import type { IfTagsResolver } from "./iftags/types";

/**
 * Data provider interface for resolving modules that require external data
 *
 * All callbacks are optional - if not provided, the corresponding
 * module/syntax will be output as-is in the AST without resolution.
 *
 * Note: Include resolution is handled separately via resolveIncludes().
 */
export interface DataProvider {
  /**
   * Fetch data for ListPages module
   * Called during resolve phase with query parameters
   *
   * @security `req.query` / `req.rawAttributes` are **untrusted user input** from wikitext.
   * When building database queries:
   * - **NEVER** interpolate them into SQL strings
   * - **ALWAYS** use parameterized queries / prepared statements
   * - For `order` (ORDER BY), use a whitelist of allowed column names
   */
  fetchListPages?: ListPagesDataFetcher;

  /**
   * Fetch data for ListUsers module
   * Called during resolve phase with user query parameters
   */
  fetchListUsers?: ListUsersDataFetcher;

  /**
   * Get current page's tags for iftags evaluation
   * Called during resolve phase to evaluate [[iftags]] conditions
   */
  getPageTags?: IfTagsResolver;
}
