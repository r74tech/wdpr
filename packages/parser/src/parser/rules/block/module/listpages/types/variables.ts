/**
 * All supported ListPages template variables.
 */
export type ListPagesVariable =
  // Lifecycle - created
  | "created_at"
  | "created_by"
  | "created_by_unix"
  | "created_by_id"
  | "created_by_linked"
  // Lifecycle - updated
  | "updated_at"
  | "updated_by"
  | "updated_by_unix"
  | "updated_by_id"
  | "updated_by_linked"
  // Lifecycle - commented
  | "commented_at"
  | "commented_by"
  | "commented_by_unix"
  | "commented_by_id"
  | "commented_by_linked"
  // Structure - page
  | "name"
  | "category"
  | "fullname"
  | "title"
  | "title_linked"
  | "link"
  // Structure - parent
  | "parent_name"
  | "parent_category"
  | "parent_fullname"
  | "parent_title"
  | "parent_title_linked"
  // Content
  | "content"
  | "content_n"
  | "preview"
  | "preview_n"
  | "summary"
  | "first_paragraph"
  // Tags
  | "tags"
  | "tags_linked"
  | "_tags"
  | "_tags_linked"
  // Form data
  | "form_data"
  | "form_raw"
  | "form_label"
  | "form_hint"
  // Metrics
  | "children"
  | "comments"
  | "size"
  | "rating"
  | "rating_votes"
  | "rating_percent"
  | "revisions"
  // Pagination
  | "index"
  | "total"
  | "limit"
  | "total_or_limit"
  // Site context
  | "site_title"
  | "site_name"
  | "site_domain";
