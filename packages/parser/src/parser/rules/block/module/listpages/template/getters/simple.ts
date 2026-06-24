import {
  formatDate,
  formatUserLinked,
  getFirstParagraph,
  getSummary,
} from "../format";
import type { VariableGetter } from "./types";

/** Default character count for `%%preview%%` when no length is specified (Wikidot default). */
const DEFAULT_PREVIEW_LENGTH = 200;

export const SIMPLE_GETTERS: Record<string, VariableGetter> = {
  created_at: (ctx) => formatDate(ctx.page.createdAt),
  created_by: (ctx) => ctx.page.createdBy?.name ?? "Anonymous",
  created_by_unix: (ctx) => ctx.page.createdBy?.unixName ?? "",
  created_by_id: (ctx) => String(ctx.page.createdBy?.id ?? 0),
  created_by_linked: (ctx) => formatUserLinked(ctx.page.createdBy),

  updated_at: (ctx) => formatDate(ctx.page.updatedAt),
  updated_by: (ctx) => ctx.page.updatedBy?.name ?? "Anonymous",
  updated_by_unix: (ctx) => ctx.page.updatedBy?.unixName ?? "",
  updated_by_id: (ctx) => String(ctx.page.updatedBy?.id ?? 0),
  updated_by_linked: (ctx) => formatUserLinked(ctx.page.updatedBy),

  commented_at: (ctx) => (ctx.page.commentedAt ? formatDate(ctx.page.commentedAt) : ""),
  commented_by: (ctx) => ctx.page.commentedBy?.name ?? "",
  commented_by_unix: (ctx) => ctx.page.commentedBy?.unixName ?? "",
  commented_by_id: (ctx) => String(ctx.page.commentedBy?.id ?? 0),
  commented_by_linked: (ctx) => formatUserLinked(ctx.page.commentedBy),

  name: (ctx) => ctx.page.name,
  category: (ctx) => ctx.page.category,
  fullname: (ctx) => ctx.page.fullname,
  title: (ctx) => ctx.page.title,
  title_linked: (ctx) => `[[[${ctx.page.fullname} | ${ctx.page.title}]]]`,
  link: (ctx) => `https://${ctx.site.domain}/${ctx.page.fullname}`,

  parent_name: (ctx) => ctx.page.parentName ?? "",
  parent_category: (ctx) => ctx.page.parentCategory ?? "",
  parent_fullname: (ctx) => ctx.page.parentFullname ?? "",
  parent_title: (ctx) => ctx.page.parentTitle ?? "",
  parent_title_linked: (ctx) =>
    ctx.page.parentFullname ? `[[[${ctx.page.parentFullname} | ${ctx.page.parentTitle}]]]` : "",

  content: (ctx) => ctx.page.content ?? "",
  preview: (ctx) => (ctx.page.content ?? "").slice(0, DEFAULT_PREVIEW_LENGTH),
  summary: (ctx) => getSummary(ctx.page),
  first_paragraph: (ctx) => getFirstParagraph(ctx.page.content),

  tags: (ctx) => ctx.page.tags.join(" "),
  _tags: (ctx) => ctx.page.hiddenTags.join(" "),

  children: (ctx) => String(ctx.page.children),
  comments: (ctx) => String(ctx.page.comments),
  size: (ctx) => String(ctx.page.size),
  rating: (ctx) => String(ctx.page.rating),
  rating_votes: (ctx) => String(ctx.page.ratingVotes),
  rating_percent: (ctx) => String(ctx.page.ratingPercent ?? 0),
  revisions: (ctx) => String(ctx.page.revisions),

  index: (ctx) => String(ctx.index),
  total: (ctx) => String(ctx.total),
  limit: (ctx) => (ctx.limit !== undefined ? String(ctx.limit) : ""),
  total_or_limit: (ctx) =>
    String(ctx.limit !== undefined ? Math.min(ctx.total, ctx.limit) : ctx.total),

  site_title: (ctx) => ctx.site.title,
  site_name: (ctx) => ctx.site.name,
  site_domain: (ctx) => ctx.site.domain,
};
