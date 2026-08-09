import type { ImageSource, WikitextSettings } from "@wdprlib/ast";
import type { PageContext } from "../types";
import { hasAsciiControl, joinSafeLocalPath, normalizeSafeLocalPath } from "./local-path";

const ABSOLUTE_URL_WITH_AUTHORITY = /^[A-Za-z][A-Za-z0-9+.-]*:\/\//;

export function resolveImageSource(
  source: ImageSource,
  settings: WikitextSettings,
  page: PageContext | undefined,
): string | null {
  const pageName = page?.pageName;
  switch (source.type) {
    case "url": {
      const url = source.data;
      if (url.trim() !== url || hasAsciiControl(url) || url.includes("\\")) return null;
      if (url.startsWith("/") && !url.startsWith("//")) {
        if (!settings.allowLocalPaths) return null;
        const path = normalizeSafeLocalPath(url);
        return path === null ? null : `/local--files/${path}`;
      }
      return url.startsWith("//") || ABSOLUTE_URL_WITH_AUTHORITY.test(url) ? url : null;
    }
    case "file1": {
      if (!settings.allowLocalPaths) return null;
      const path = joinSafeLocalPath(pageName ? [pageName, source.data.file] : [source.data.file]);
      return path === null ? null : `/local--files/${path}`;
    }
    case "file2": {
      if (!settings.allowLocalPaths) return null;
      const path = joinSafeLocalPath([source.data.page, source.data.file]);
      return path === null ? null : `/local--files/${path}`;
    }
    case "file3": {
      if (!settings.allowLocalPaths) return null;
      const path = joinSafeLocalPath([source.data.site, source.data.page, source.data.file]);
      return path === null ? null : `/local--files/${path}`;
    }
  }
}
