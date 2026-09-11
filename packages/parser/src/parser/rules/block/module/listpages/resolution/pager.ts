import type { Element } from "@wdprlib/ast";
import type { ListPagesExternalData } from "../types";

export function createListPagesPager(data: ListPagesExternalData): Element[] {
  const pagination = data.pagination;
  if (!pagination || pagination.totalPages <= 1) return [];
  const { currentPage, totalPages, urlPath, parameter } = pagination;
  const pages = new Set([1, totalPages]);
  for (
    let page = Math.max(1, currentPage - 2);
    page <= Math.min(totalPages, currentPage + 2);
    page++
  ) {
    pages.add(page);
  }
  return [
    {
      element: "pager",
      data: {
        currentPage,
        totalPages,
        pages: [...pages]
          .sort((a, b) => a - b)
          .map((page) => ({
            page,
            href: pageUrl(urlPath, parameter, page),
          })),
      },
    },
  ];
}

function pageUrl(urlPath: string, parameter: string, page: number): string {
  const suffixStart = urlPath.search(/[?#]/);
  const path = suffixStart === -1 ? urlPath : urlPath.slice(0, suffixStart);
  const suffix = suffixStart === -1 ? "" : urlPath.slice(suffixStart);
  const parts = path.split("/");
  const result = parts.slice(0, 2);
  for (let index = 2; index < parts.length; index += 2) {
    if (parts[index] !== parameter) result.push(...parts.slice(index, index + 2));
  }
  return `${result.join("/").replace(/\/$/, "")}/${parameter}/${page}${suffix}`;
}
