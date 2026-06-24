import type { DataProvider } from "../types-common";
import type {
  CompiledTemplate,
  ListPagesDataRequirement,
  ListPagesExternalData,
} from "../listpages/types";
import type {
  ListUsersCompiledTemplate,
  ListUsersDataRequirement,
  ListUsersExternalData,
} from "../listusers/types";
import type { ParseFunction } from "../listpages/resolve";
import { buildListPagesDataMap, buildListUsersDataMap } from "./data-maps";

/**
 * Context for ListPages resolution.
 */
export interface ListPagesContext {
  dataMap: Map<number, ListPagesExternalData>;
  compiledTemplates: Map<number, CompiledTemplate>;
  parse: ParseFunction;
}

/**
 * Context for ListUsers resolution.
 */
export interface ListUsersContext {
  dataMap: Map<number, ListUsersExternalData>;
  compiledTemplates: Map<number, ListUsersCompiledTemplate>;
  parse: ParseFunction;
}

export async function buildListPagesContext(
  dataProvider: DataProvider,
  requirements: ListPagesDataRequirement[],
  compiledTemplates: Map<number, CompiledTemplate>,
  parse: ParseFunction,
  urlPath: string | undefined,
): Promise<ListPagesContext | null> {
  if (requirements.length === 0 || !dataProvider.fetchListPages) {
    return null;
  }

  const dataMap = await buildListPagesDataMap(dataProvider, requirements, urlPath);

  if (dataMap.size === 0) {
    return null;
  }

  return {
    dataMap,
    compiledTemplates,
    parse,
  };
}

export async function buildListUsersContext(
  dataProvider: DataProvider,
  requirements: ListUsersDataRequirement[],
  compiledTemplates: Map<number, ListUsersCompiledTemplate> | undefined,
  parse: ParseFunction,
): Promise<ListUsersContext | null> {
  if (requirements.length === 0 || !dataProvider.fetchListUsers) {
    return null;
  }

  const dataMap = await buildListUsersDataMap(dataProvider, requirements);

  if (dataMap.size === 0) {
    return null;
  }

  return {
    dataMap,
    compiledTemplates: compiledTemplates ?? new Map(),
    parse,
  };
}
