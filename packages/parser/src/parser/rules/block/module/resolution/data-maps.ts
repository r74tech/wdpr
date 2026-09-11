import type { DataProvider } from "../types-common";
import type { ListPagesDataRequirement, ListPagesExternalData } from "../listpages/types";
import type { ListUsersDataRequirement, ListUsersExternalData } from "../listusers/types";
import type { TagCloudDataRequirement, TagCloudExternalData } from "../tagcloud/types";
import { parseUrlParams, resolveAndNormalizeQuery } from "../listpages/url-resolver";

export interface ListPagesPaginationState {
  nextUnprefixed: number;
}

export async function buildListPagesDataMap(
  dataProvider: DataProvider,
  requirements: ListPagesDataRequirement[],
  urlPath: string | undefined,
  paginationState: ListPagesPaginationState = { nextUnprefixed: 1 },
): Promise<Map<number, ListPagesExternalData>> {
  const dataMap = new Map<number, ListPagesExternalData>();
  const urlParams = parseUrlParams(urlPath ?? "", true);

  for (const req of requirements) {
    const normalizedQuery = resolveAndNormalizeQuery(req, urlParams);
    if (!urlPath || !urlPath.startsWith("/") || urlPath.startsWith("//")) {
      const data = await dataProvider.fetchListPages?.(normalizedQuery, req);
      if (data) dataMap.set(req.id, data);
      continue;
    }
    const ordinal = req.urlAttrPrefix ? 0 : paginationState.nextUnprefixed++;
    const parameter = req.urlAttrPrefix
      ? `${encodeURIComponent(req.urlAttrPrefix)}_p`
      : ordinal === 1
        ? "p"
        : `p${ordinal}`;
    const perPage = Math.min(250, positiveInteger(normalizedQuery.perPage, 20));
    const baseOffset = positiveInteger(normalizedQuery.offset, 0);
    const limit =
      normalizedQuery.limit !== undefined && normalizedQuery.limit >= 0
        ? Math.floor(normalizedQuery.limit)
        : undefined;
    const rawPage = urlParams.get(parameter) ?? "1";
    let currentPage = /^\d+$/.test(rawPage) ? positiveInteger(Number(rawPage), 1) : 1;
    currentPage = Math.min(
      currentPage,
      Math.floor((Number.MAX_SAFE_INTEGER - baseOffset) / perPage) + 1,
    );
    if (limit !== undefined)
      currentPage = Math.min(currentPage, Math.max(1, Math.ceil(limit / perPage)));
    const fetchPage = () => {
      const relativeOffset = (currentPage - 1) * perPage;
      return dataProvider.fetchListPages?.(
        {
          ...normalizedQuery,
          offset: baseOffset + relativeOffset,
          limit: Math.min(
            perPage,
            limit === undefined ? perPage : Math.max(0, limit - relativeOffset),
          ),
          perPage,
        },
        req,
      );
    };
    let data = await fetchPage();
    if (data) {
      const count = Math.min(Math.max(0, data.totalCount - baseOffset), limit ?? Infinity);
      const totalPages = Math.ceil(count / perPage);
      const lastPage = Math.max(1, totalPages);
      if (currentPage > lastPage) {
        currentPage = lastPage;
        data = await fetchPage();
      }
      if (data)
        dataMap.set(req.id, {
          ...data,
          pages: data.pages.slice(
            0,
            Math.min(perPage, Math.max(0, count - (currentPage - 1) * perPage)),
          ),
          pagination: {
            currentPage,
            perPage,
            totalPages,
            offset: baseOffset + (currentPage - 1) * perPage,
            limit,
            urlPath,
            parameter,
          },
        });
    }
  }

  return dataMap;
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isSafeInteger(value) && value > 0 ? value : fallback;
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
