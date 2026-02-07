/**
 *
 * Type definitions for the ListUsers module.
 *
 * The `[[module ListUsers users="."]]` block displays information about site
 * members. Currently, only `users="."` (the logged-in user) is supported.
 * The template body can reference three variables: `%%number%%`, `%%title%%`,
 * and `%%name%%`.
 *
 * @module
 */

/**
 * Supported template variables for ListUsers.
 *
 * - `number` - The user's numeric ID
 * - `title` - The user's display title/nickname
 * - `name` - The user's account name
 */
export type ListUsersVariable = "number" | "title" | "name";

/**
 * User data that must be provided by the external data source.
 *
 * Each field corresponds to a template variable of the same name.
 */
export interface ListUsersUserData {
  /** The user's numeric ID, rendered by `%%number%%` */
  number: number;
  /** The user's display title, rendered by `%%title%%` */
  title: string;
  /** The user's account name, rendered by `%%name%%` */
  name: string;
}

/**
 * Data requirement for a single ListUsers module instance.
 *
 * Produced by the extraction phase and consumed by the application to
 * determine what data to fetch.
 */
export interface ListUsersDataRequirement {
  /** Unique identifier for this module instance (sequential, 0-based) */
  id: number;
  /** The `users` attribute value (currently only `"."` is supported) */
  users: string;
  /** Template variables that need data from the external source */
  neededVariables: ListUsersVariable[];
}

/**
 * External data provided by the application for a single ListUsers module.
 *
 * Currently ListUsers only returns information about the logged-in user.
 * Return null/undefined from the fetcher to indicate no user is logged in.
 */
export interface ListUsersExternalData {
  /** Data for the logged-in user */
  user: ListUsersUserData;
}

/**
 * Callback to fetch user data for a ListUsers module.
 *
 * Called during the resolution phase for each ListUsers module in the AST.
 * Return null/undefined to skip the module (outputs nothing, e.g., when
 * no user is logged in).
 *
 * @param requirement - The data requirement describing what data is needed
 * @returns User data, null/undefined to skip, or a Promise of the same
 */
export type ListUsersDataFetcher = (
  requirement: ListUsersDataRequirement,
) => ListUsersExternalData | null | undefined | Promise<ListUsersExternalData | null | undefined>;

/**
 * Context passed to a compiled ListUsers template function during rendering.
 */
export interface ListUsersVariableContext {
  /** The user whose data is being rendered */
  user: ListUsersUserData;
}

/**
 * A compiled ListUsers template function.
 *
 * Accepts a variable context and returns the rendered wikitext string
 * with all `%%variable%%` placeholders substituted.
 *
 * @param ctx - The variable context containing user data
 * @returns Rendered wikitext string
 */
export type ListUsersCompiledTemplate = (ctx: ListUsersVariableContext) => string;
