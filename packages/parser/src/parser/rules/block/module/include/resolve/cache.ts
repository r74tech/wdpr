import type { PageRef } from "@wdprlib/ast";
import type { AsyncIncludeFetcher, IncludeFetcher } from "./types";

export function createCachedIncludeFetcher(
  fetcher: IncludeFetcher,
  normalizeKey: (pageRef: PageRef) => string,
): IncludeFetcher {
  const cache = new Map<string, string | null>();

  return (pageRef: PageRef): string | null => {
    const key = normalizeKey(pageRef);
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    let result: string | null;
    try {
      result = fetcher(pageRef);
    } catch {
      result = null;
    }
    cache.set(key, result);
    return result;
  };
}

export function createCachedAsyncIncludeFetcher(
  fetcher: AsyncIncludeFetcher,
  normalizeKey: (pageRef: PageRef) => string,
): AsyncIncludeFetcher {
  const cache = new Map<string, Promise<string | null>>();

  return async (pageRef: PageRef): Promise<string | null> => {
    const key = normalizeKey(pageRef);
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }

    const result = fetcher(pageRef).catch(() => null);
    cache.set(key, result);
    return result;
  };
}
