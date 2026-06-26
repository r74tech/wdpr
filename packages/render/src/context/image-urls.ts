import type { ImageSource, WikitextSettings } from "@wdprlib/ast";
import type { PageContext } from "../types";

export function resolveImageSource(
  source: ImageSource,
  settings: WikitextSettings,
  page: PageContext | undefined,
): string | null {
  const pageName = page?.pageName;
  switch (source.type) {
    case "url": {
      const url = source.data;
      if (url.startsWith("/") && !url.startsWith("//")) {
        if (!settings.allowLocalPaths) return null;
        return `/local--files${url}`;
      }
      return url;
    }
    case "file1":
      if (!settings.allowLocalPaths) return null;
      return pageName ? `/local--files/${pageName}/${source.data.file}` : `/local--files/${source.data.file}`;
    case "file2":
      if (!settings.allowLocalPaths) return null;
      return `/local--files/${source.data.page}/${source.data.file}`;
    case "file3":
      if (!settings.allowLocalPaths) return null;
      return `/local--files/${source.data.site}/${source.data.page}/${source.data.file}`;
  }
}
