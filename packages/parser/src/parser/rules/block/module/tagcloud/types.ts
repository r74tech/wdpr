/**
 *
 * Type definitions for the TagCloud module.
 *
 * The `[[module TagCloud]]` block displays a weighted cloud of page tags.
 * Tag data (tag names and page counts) is supplied by the application via
 * `DataProvider.fetchTagCloud` during the resolution phase.
 *
 * @module
 */

/**
 * Data requirement for a single TagCloud module instance.
 *
 * Produced by the extraction phase and consumed by the application to
 * determine what data to fetch.
 */
export interface TagCloudDataRequirement {
  /** Unique identifier for this module instance (sequential, 0-based) */
  id: number;
  /** Category filter from the module attributes, or null for all categories */
  category: string | null;
  /** Maximum number of tags to display (already defaulted to 50) */
  limit: number;
}

/**
 * A single tag entry with its weight.
 */
export interface TagCloudTagData {
  /** The tag name */
  tag: string;
  /** Number of pages carrying this tag (Wikidot's "weight") */
  weight: number;
}

/**
 * External data provided by the application for a single TagCloud module.
 *
 * On success, `category` must be the **normalized** category name (Wikidot's
 * `toUnixName` form, e.g. `"News Foo"` → `"news-foo"`), or null when no
 * category filter applies; it is used verbatim in generated tag link URLs.
 * When the requested category does not exist, return
 * `{ status: "category-not-found", category }` to produce a Wikidot-compatible
 * error block instead of tag links.
 */
export type TagCloudExternalData =
  | {
      status: "ok";
      /** Tags to display (see {@link TagCloudDataFetcher} for ordering) */
      tags: TagCloudTagData[];
      /** Normalized category name used in link URLs, or null for all categories */
      category: string | null;
    }
  | {
      status: "category-not-found";
      /** The category name that could not be found, used in the error message */
      category: string;
    };

/**
 * Callback to fetch tag data for a TagCloud module.
 *
 * Called during the resolution phase for each TagCloud module in the AST.
 * Like Wikidot, the fetcher should apply the `category` filter and select at
 * most `limit` tags ordered by weight descending (ties broken by tag name
 * ascending) — this can be delegated to the database. The resolver defensively
 * re-applies this ordering and the limit, then sorts the selected tags by tag
 * name ascending for display.
 *
 * Return null/undefined to skip the module (outputs nothing). Exceptions
 * thrown by the fetcher propagate out of `resolveModules()`; return
 * `{ status: "category-not-found" }` (or catch errors yourself) to render an
 * error instead.
 *
 * @security `requirement.category` originates from **untrusted user input**
 * (the module's wikitext attributes). Never interpolate it into SQL — always
 * use parameterised queries or prepared statements.
 *
 * @param requirement - The data requirement describing what data is needed
 * @returns Tag data, null/undefined to skip, or a Promise of the same
 */
export type TagCloudDataFetcher = (
  requirement: TagCloudDataRequirement,
) => TagCloudExternalData | null | undefined | Promise<TagCloudExternalData | null | undefined>;
