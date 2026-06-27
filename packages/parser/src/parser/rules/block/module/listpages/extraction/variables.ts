import type { ListPagesVariable } from "../types";

const KNOWN_VARIABLES: ReadonlySet<ListPagesVariable> = new Set([
  "created_at",
  "created_by",
  "created_by_unix",
  "created_by_id",
  "created_by_linked",
  "updated_at",
  "updated_by",
  "updated_by_unix",
  "updated_by_id",
  "updated_by_linked",
  "commented_at",
  "commented_by",
  "commented_by_unix",
  "commented_by_id",
  "commented_by_linked",
  "name",
  "category",
  "fullname",
  "title",
  "title_linked",
  "link",
  "parent_name",
  "parent_category",
  "parent_fullname",
  "parent_title",
  "parent_title_linked",
  "content",
  "preview",
  "summary",
  "first_paragraph",
  "tags",
  "_tags",
  "children",
  "comments",
  "size",
  "rating",
  "rating_votes",
  "rating_percent",
  "revisions",
  "index",
  "total",
  "limit",
  "total_or_limit",
  "site_title",
  "site_name",
  "site_domain",
]);

export function normalizeVariableName(name: string): ListPagesVariable | null {
  if (KNOWN_VARIABLES.has(name as ListPagesVariable)) {
    return name as ListPagesVariable;
  }

  return null;
}
