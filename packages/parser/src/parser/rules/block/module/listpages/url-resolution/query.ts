import type { ListPagesQuery } from "../types";
import type { UrlResolvableField } from "./fields";

export function assignResolvedUrlField(
  query: ListPagesQuery,
  field: UrlResolvableField,
  value: string,
): void {
  switch (field.type) {
    case "number": {
      const num = parseInt(value, 10);
      if (!Number.isNaN(num)) {
        query[field.queryKey] = num;
      }
      return;
    }
    case "boolean":
      query[field.queryKey] = value === "true" || value === "yes" || value === "1";
      return;
    case "string":
      Object.assign(query, { [field.queryKey]: value });
      return;
  }
}
