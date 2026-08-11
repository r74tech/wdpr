import type { ListPagesQuery } from "../types";

export type UrlResolvableField =
  | {
      attr: string;
      queryKey: StringUrlQueryKey;
      type: "string";
      aliases?: readonly string[];
      urlAttrs?: readonly string[];
    }
  | {
      attr: string;
      queryKey: NumberUrlQueryKey;
      type: "number";
      aliases?: readonly string[];
      urlAttrs?: readonly string[];
    }
  | {
      attr: string;
      queryKey: BooleanUrlQueryKey;
      type: "boolean";
      aliases?: readonly string[];
      urlAttrs?: readonly string[];
    };

type StringUrlQueryKey = Extract<
  keyof ListPagesQuery,
  | "order"
  | "tags"
  | "category"
  | "parent"
  | "range"
  | "name"
  | "fullname"
  | "createdAt"
  | "updatedAt"
  | "createdBy"
  | "rating"
  | "votes"
>;

type NumberUrlQueryKey = Extract<keyof ListPagesQuery, "offset" | "limit" | "perPage">;
type BooleanUrlQueryKey = Extract<keyof ListPagesQuery, "reverse">;

/**
 * Mapping of module attribute names to their corresponding `ListPagesQuery` keys
 * and expected value types. Only fields listed here support `@URL` resolution.
 */
export const URL_RESOLVABLE_FIELDS: readonly UrlResolvableField[] = [
  { attr: "offset", queryKey: "offset", type: "number" },
  { attr: "limit", queryKey: "limit", type: "number" },
  {
    attr: "per-page",
    queryKey: "perPage",
    type: "number",
    aliases: ["perpage", "per_page"],
  },
  { attr: "order", queryKey: "order", type: "string" },
  { attr: "tags", queryKey: "tags", type: "string", urlAttrs: ["tag"] },
  { attr: "category", queryKey: "category", type: "string" },
  { attr: "parent", queryKey: "parent", type: "string" },
  { attr: "range", queryKey: "range", type: "string" },
  { attr: "name", queryKey: "name", type: "string" },
  { attr: "fullname", queryKey: "fullname", type: "string" },
  {
    attr: "created-at",
    queryKey: "createdAt",
    type: "string",
    aliases: ["createdat", "created_at"],
  },
  {
    attr: "updated-at",
    queryKey: "updatedAt",
    type: "string",
    aliases: ["updatedat", "updated_at"],
  },
  {
    attr: "created-by",
    queryKey: "createdBy",
    type: "string",
    aliases: ["createdby", "created_by"],
  },
  { attr: "rating", queryKey: "rating", type: "string" },
  { attr: "votes", queryKey: "votes", type: "string" },
  { attr: "reverse", queryKey: "reverse", type: "boolean" },
];
