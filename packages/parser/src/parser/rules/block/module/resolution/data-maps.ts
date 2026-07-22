import type { DataProvider } from "../types-common";
import type { ListPagesDataRequirement, ListPagesExternalData } from "../listpages/types";
import type { ListUsersDataRequirement, ListUsersExternalData } from "../listusers/types";
import type { TagCloudDataRequirement, TagCloudExternalData } from "../tagcloud/types";
import { parseUrlParams, resolveAndNormalizeQuery } from "../listpages/url-resolver";

export async function buildListPagesDataMap(
  dataProvider: DataProvider,
  requirements: ListPagesDataRequirement[],
  urlPath: string | undefined,
): Promise<Map<number, ListPagesExternalData>> {
  const dataMap = new Map<number, ListPagesExternalData>();
  const urlParams = parseUrlParams(urlPath ?? "");

  for (const req of requirements) {
    const normalizedQuery = resolveAndNormalizeQuery(req, urlParams);
    const data = await dataProvider.fetchListPages?.(normalizedQuery, req);
    if (data) {
      dataMap.set(req.id, data);
    }
  }

  return dataMap;
}

export async function buildListUsersDataMap(
  dataProvider: DataProvider,
  requirements: ListUsersDataRequirement[],
): Promise<Map<number, ListUsersExternalData>> {
  const dataMap = new Map<number, ListUsersExternalData>();

  for (const req of requirements) {
    const data = await dataProvider.fetchListUsers?.(req);
    if (data) {
      dataMap.set(req.id, data);
    }
  }

  return dataMap;
}

export async function buildTagCloudDataMap(
  dataProvider: DataProvider,
  requirements: TagCloudDataRequirement[],
): Promise<Map<number, TagCloudExternalData>> {
  const dataMap = new Map<number, TagCloudExternalData>();

  for (const req of requirements) {
    const data = await dataProvider.fetchTagCloud?.(req);
    if (data) {
      dataMap.set(req.id, data);
    }
  }

  return dataMap;
}
