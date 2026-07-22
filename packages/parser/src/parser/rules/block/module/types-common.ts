/**
 * Shared callback interface for module resolution.
 *
 * `DataProvider` is the single object that callers pass to
 * `resolveModules()` to supply external data. Each property is an
 * optional async callback; if omitted the corresponding module type is
 * left unresolved in the AST.
 *
 * Include resolution uses a separate API (`resolveIncludes()`)
 * because it operates on raw wikitext before parsing, not on AST nodes.
 *
 * @module
 */

import type { ListPagesDataFetcher } from "./listpages/types";
import type { ListUsersDataFetcher } from "./listusers/types";
import type { TagCloudDataFetcher } from "./tagcloud/types";
import type { IfTagsResolver } from "./iftags/types";
import type { IncludeFetcher } from "./include/resolve/types";

/**
 * Callback bag for supplying external data during module resolution.
 *
 * Pass an instance to `resolveModules()`. Every callback is optional:
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
   * Fetch raw wikitext for `[[include]]` directives that are created during
   * module secondary transformations such as ListPages/ListUsers item rendering.
   *
   * Top-level include expansion still uses `resolveIncludes()` directly before
   * parsing. This callback is only for module-rendered wikitext that needs its
   * own include pass before being parsed again.
   */
  fetchInclude?: IncludeFetcher;

  /**
   * Fetch tag weights for `[[module TagCloud]]` expansion.
   *
   * Called once per TagCloud instance with its category filter and limit.
   * Unlike {@link DataProvider.getPageTags} (which returns the current
   * page's own tags for `[[iftags]]`), this callback returns site-wide
   * tag statistics: each tag with the number of pages carrying it.
   *
   * @security `requirement.category` originates from **untrusted user
   * input**. Never interpolate it into SQL — always use parameterised
   * queries or prepared statements.
   */
  fetchTagCloud?: TagCloudDataFetcher;

  /**
   * Return the current page's tags for `[[iftags]]` evaluation.
   *
   * If provided, `[[iftags]]` blocks are evaluated and either kept or
   * discarded based on whether the page's tags satisfy the condition.
   * If omitted, `[[iftags]]` blocks pass through unresolved.
   */
  getPageTags?: IfTagsResolver;
}
