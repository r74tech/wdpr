/**
 * ListUsers module types
 */

/**
 * Supported template variables
 */
export type ListUsersVariable = "number" | "title" | "name";

/**
 * User data provided by external source
 */
export interface ListUsersUserData {
  number: number;
  title: string;
  name: string;
}

/**
 * Data requirement for a single ListUsers module
 */
export interface ListUsersDataRequirement {
  id: number;
  users: string;
  neededVariables: ListUsersVariable[];
}

/**
 * External data for a single ListUsers module
 * Note: ListUsers returns only the logged-in user
 */
export interface ListUsersExternalData {
  user: ListUsersUserData;
}

/**
 * Callback to fetch data for a ListUsers module
 */
export type ListUsersDataFetcher = (
  requirement: ListUsersDataRequirement,
) => ListUsersExternalData | null | undefined | Promise<ListUsersExternalData | null | undefined>;

/**
 * Context passed to compiled template
 */
export interface ListUsersVariableContext {
  user: ListUsersUserData;
}

/**
 * Compiled template function
 */
export type ListUsersCompiledTemplate = (ctx: ListUsersVariableContext) => string;
