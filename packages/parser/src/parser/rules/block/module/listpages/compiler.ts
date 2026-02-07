/**
 * @module listpages/compiler
 *
 * Template compiler for the ListPages module.
 *
 * Compiles ListPages template strings (e.g., `"%%title%% by %%created_by%%"`)
 * into executable functions that can be called repeatedly with different page
 * data for fast rendering. The compilation step splits the template into static
 * string segments and dynamic getter functions, avoiding repeated regex matching
 * during rendering.
 *
 * Supported variable syntax:
 * - `%%name%%` - Simple variable (e.g., `%%title%%`, `%%rating%%`)
 * - `%%name{param}%%` - Parameterized variable (e.g., `%%content{2}%%`, `%%form_data{color}%%`)
 * - `%%name(param)%%` - Parenthesized parameter (e.g., `%%preview(100)%%`)
 * - `%%name|format%%` - Formatted variable (e.g., `%%created_at|%Y-%m-%d%%`, `%%tags_linked|/tag/%%`)
 *
 * The compiled function is a closure over the parsed template parts, providing
 * O(n) rendering time proportional to the number of template segments.
 */

import type { CompiledTemplate, VariableContext, PageData, UserInfo } from "./types";

/** Default character count for `%%preview%%` when no length is specified (Wikidot default). */
const DEFAULT_PREVIEW_LENGTH = 200;

/**
 * Regex pattern for matching ListPages template variables with all parameter variants.
 *
 * Captures: [1] variable name, [2] brace parameter, [3] paren parameter, [4] format string.
 * The format portion allows single `%` characters (for strftime tokens like `%Y`)
 * but stops at `%%` (which terminates the variable).
 */
const VARIABLE_REGEX =
  /%%([a-z_]+)(?:\{([^}]+)\})?(?:\((\d+)\))?(?:\|([^%]*(?:%(?!%)[^%]*)*))?%%/gi;

/**
 * Compile a ListPages template string into an executable function.
 *
 * The template is split into alternating static strings and dynamic getter
 * functions. The returned function concatenates these parts with the getter
 * functions evaluated against the provided variable context.
 *
 * @param template - The template string containing `%%variable%%` placeholders
 * @returns A compiled function that accepts a `VariableContext` and returns the rendered string
 */
export function compileTemplate(template: string): CompiledTemplate {
  const parts: (string | ((ctx: VariableContext) => string))[] = [];
  let lastIndex = 0;

  // Split template into static and dynamic parts
  for (const match of template.matchAll(VARIABLE_REGEX)) {
    // Add static part before this match
    if (match.index !== undefined && match.index > lastIndex) {
      parts.push(template.slice(lastIndex, match.index));
    }

    // Convert variable to getter function
    const [, varName, braceParam, parenParam, format] = match;
    if (!varName) continue;
    const getter = createVariableGetter(varName.toLowerCase(), braceParam, parenParam, format);
    parts.push(getter);

    lastIndex = match.index !== undefined ? match.index + match[0].length : lastIndex;
  }

  // Add remaining static part
  if (lastIndex < template.length) {
    parts.push(template.slice(lastIndex));
  }

  // Return compiled function
  return (ctx: VariableContext): string => {
    let result = "";
    for (const part of parts) {
      result += typeof part === "string" ? part : part(ctx);
    }
    return result;
  };
}

/**
 * Create a getter function for a specific template variable.
 *
 * Handles all variable variants: parameterized (`{param}`), parenthesized (`(param)`),
 * formatted (`|format`), and simple. Returns a function that extracts the appropriate
 * value from a `VariableContext`.
 *
 * Unknown variable names return a function that always returns an empty string,
 * matching Wikidot's behavior of silently ignoring unknown variables.
 *
 * @param name - Lowercase variable name
 * @param braceParam - Content inside `{...}`, if present
 * @param parenParam - Content inside `(...)`, if present
 * @param format - Content after `|`, if present
 * @returns A function that extracts the variable's value from a VariableContext
 */
function createVariableGetter(
  name: string,
  braceParam?: string,
  parenParam?: string,
  format?: string,
): (ctx: VariableContext) => string {
  // Parameterized variables with {param}
  if (braceParam !== undefined) {
    switch (name) {
      case "content": {
        // %%content{n}%% - n is 1-indexed, split content by ==== on demand
        const idx = Number(braceParam) - 1;
        return (ctx) => {
          if (!ctx.page.content) return "";
          const sections = splitContentSections(ctx.page.content);
          return sections[idx] ?? "";
        };
      }
      case "form_data":
        return (ctx) => ctx.page.formData?.[braceParam] ?? "";
      case "form_raw":
        return (ctx) => ctx.page.formRaw?.[braceParam] ?? "";
      case "form_label":
        return (ctx) => ctx.page.formLabel?.[braceParam] ?? "";
      case "form_hint":
        return (ctx) => ctx.page.formHint?.[braceParam] ?? "";
    }
  }

  // Parameterized variables with (param)
  if (parenParam !== undefined && name === "preview") {
    const len = Number(parenParam);
    return (ctx) => (ctx.page.content ?? "").slice(0, len);
  }

  // Date variables with format
  if (format !== undefined) {
    switch (name) {
      case "created_at":
        return (ctx) => formatDate(ctx.page.createdAt, format);
      case "updated_at":
        return (ctx) => formatDate(ctx.page.updatedAt, format);
      case "commented_at":
        return (ctx) => (ctx.page.commentedAt ? formatDate(ctx.page.commentedAt, format) : "");
    }
  }

  // tags_linked with prefix
  if (name === "tags_linked") {
    const prefix = format ?? "/system:page-tags/tag/";
    return (ctx) => formatTagsLinked(ctx.page.tags, prefix);
  }
  if (name === "_tags_linked") {
    const prefix = format ?? "/system:page-tags/tag/";
    return (ctx) => formatTagsLinked(ctx.page.hiddenTags, prefix);
  }

  // Simple variables
  const getter = SIMPLE_GETTERS[name];
  if (getter) return getter;

  // Unknown variable - return empty string
  return () => "";
}

// =============================================================================
// Simple Variable Getters
// =============================================================================

const SIMPLE_GETTERS: Record<string, (ctx: VariableContext) => string> = {
  // Lifecycle - created
  created_at: (ctx) => formatDate(ctx.page.createdAt),
  created_by: (ctx) => ctx.page.createdBy?.name ?? "Anonymous",
  created_by_unix: (ctx) => ctx.page.createdBy?.unixName ?? "",
  created_by_id: (ctx) => String(ctx.page.createdBy?.id ?? 0),
  created_by_linked: (ctx) => formatUserLinked(ctx.page.createdBy),

  // Lifecycle - updated
  updated_at: (ctx) => formatDate(ctx.page.updatedAt),
  updated_by: (ctx) => ctx.page.updatedBy?.name ?? "Anonymous",
  updated_by_unix: (ctx) => ctx.page.updatedBy?.unixName ?? "",
  updated_by_id: (ctx) => String(ctx.page.updatedBy?.id ?? 0),
  updated_by_linked: (ctx) => formatUserLinked(ctx.page.updatedBy),

  // Lifecycle - commented
  commented_at: (ctx) => (ctx.page.commentedAt ? formatDate(ctx.page.commentedAt) : ""),
  commented_by: (ctx) => ctx.page.commentedBy?.name ?? "",
  commented_by_unix: (ctx) => ctx.page.commentedBy?.unixName ?? "",
  commented_by_id: (ctx) => String(ctx.page.commentedBy?.id ?? 0),
  commented_by_linked: (ctx) => formatUserLinked(ctx.page.commentedBy),

  // Structure - page
  name: (ctx) => ctx.page.name,
  category: (ctx) => ctx.page.category,
  fullname: (ctx) => ctx.page.fullname,
  title: (ctx) => ctx.page.title,
  title_linked: (ctx) => `[[[${ctx.page.fullname} | ${ctx.page.title}]]]`,
  link: (ctx) => `https://${ctx.site.domain}/${ctx.page.fullname}`,

  // Structure - parent
  parent_name: (ctx) => ctx.page.parentName ?? "",
  parent_category: (ctx) => ctx.page.parentCategory ?? "",
  parent_fullname: (ctx) => ctx.page.parentFullname ?? "",
  parent_title: (ctx) => ctx.page.parentTitle ?? "",
  parent_title_linked: (ctx) =>
    ctx.page.parentFullname ? `[[[${ctx.page.parentFullname} | ${ctx.page.parentTitle}]]]` : "",

  // Content
  content: (ctx) => ctx.page.content ?? "",
  preview: (ctx) => (ctx.page.content ?? "").slice(0, DEFAULT_PREVIEW_LENGTH),
  summary: (ctx) => getSummary(ctx.page),
  first_paragraph: (ctx) => getFirstParagraph(ctx.page.content),

  // Tags
  tags: (ctx) => ctx.page.tags.join(" "),
  _tags: (ctx) => ctx.page.hiddenTags.join(" "),

  // Metrics
  children: (ctx) => String(ctx.page.children),
  comments: (ctx) => String(ctx.page.comments),
  size: (ctx) => String(ctx.page.size),
  rating: (ctx) => String(ctx.page.rating),
  rating_votes: (ctx) => String(ctx.page.ratingVotes),
  rating_percent: (ctx) => String(ctx.page.ratingPercent ?? 0),
  revisions: (ctx) => String(ctx.page.revisions),

  // Pagination
  index: (ctx) => String(ctx.index),
  total: (ctx) => String(ctx.total),
  limit: (ctx) => (ctx.limit !== undefined ? String(ctx.limit) : ""),
  total_or_limit: (ctx) =>
    String(ctx.limit !== undefined ? Math.min(ctx.total, ctx.limit) : ctx.total),

  // Site context
  site_title: (ctx) => ctx.site.title,
  site_name: (ctx) => ctx.site.name,
  site_domain: (ctx) => ctx.site.domain,
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format a Date object using an optional strftime-like format string.
 *
 * When no format is provided, returns the ISO 8601 string representation.
 *
 * @param date - The date to format
 * @param format - Optional strftime format string (e.g., `"%Y-%m-%d"`)
 * @returns Formatted date string
 */
function formatDate(date: Date, format?: string): string {
  if (!format) {
    // Default ISO format
    return date.toISOString();
  }
  return strftime(date, format);
}

/**
 * Format a user as Wikidot's `[[*user name]]` inline syntax for linked display.
 *
 * @param user - User info, or undefined for anonymous display
 * @returns Wikidot user link syntax, or "Anonymous" if no user
 */
function formatUserLinked(user?: UserInfo): string {
  if (!user) return "Anonymous";
  return `[[*user ${user.name}]]`;
}

/**
 * Format an array of tags as space-separated Wikidot link syntax.
 *
 * Each tag becomes `[prefix/tag tag]` where prefix defaults to
 * `/system:page-tags/tag/` unless overridden by the template's pipe format.
 *
 * @param tags - Array of tag names
 * @param prefix - URL prefix for tag links
 * @returns Space-separated string of Wikidot link syntax, or empty string if no tags
 */
function formatTagsLinked(tags: string[], prefix: string): string {
  if (tags.length === 0) return "";
  return tags.map((tag) => `[${prefix}${tag} ${tag}]`).join(" ");
}

/**
 * Split content by ==== separators
 *
 * wikidot uses preg_split('/^([=]{4,})$/m', $source) to split content
 * %%content{n}%% references sections[n-1] (1-indexed)
 */
function splitContentSections(content: string): string[] {
  return content.split(/^={4,}$/m).map((section) => section.trim());
}

/**
 * Extract a summary from page content.
 *
 * If the content contains `====` section separators, returns the first section
 * (equivalent to `%%content{1}%%`). Otherwise, returns the first paragraph.
 *
 * @param page - Page data containing content
 * @returns Summary text extracted from the page content
 */
function getSummary(page: PageData): string {
  if (page.content) {
    const sections = splitContentSections(page.content);
    if (sections.length > 1) {
      return sections[0]?.trim() ?? "";
    }
  }
  return getFirstParagraph(page.content);
}

/**
 * Extract the first paragraph from wikitext content.
 *
 * Strips headings, TOC directives, div blocks, and module blocks before
 * splitting on double newlines to find the first content paragraph.
 *
 * @param content - Raw wikitext content, or undefined
 * @returns The first paragraph text, or empty string if no content
 */
function getFirstParagraph(content?: string): string {
  if (!content) return "";

  // Remove headings, TOC, div, module blocks
  const s = content
    .replace(/^(\+{1,6}) (.*)/gm, "")
    .replace(/^\[\[toc(\s[^\]]+)?\]\]/gim, "")
    .replace(/^\[\[\/?div(\s[^\]]+)?\]\]/gim, "")
    .replace(/^\[\[\/?module(\s[^\]]+)?\]\]/gim, "")
    .trim();

  // Split by double newlines and take first
  const paragraphs = s.split(/\n{2,}/);
  return paragraphs[0]?.trim() ?? "";
}

/** Full month names for strftime `%B` token. Static to avoid per-call allocation. */
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
/** Abbreviated month names for strftime `%b` token. */
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
/** Full day names for strftime `%A` token. */
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Abbreviated day names for strftime `%a` token. */
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Pre-compiled regex matching strftime tokens (`%X` where X is a supported letter or `%`). */
const STRFTIME_REGEX = /%([YymdHeHIMSpbBaAwjZz%])/g;

/**
 * Minimal strftime implementation supporting common tokens.
 *
 * Uses a single-pass regex replace for O(n) performance. All dates are
 * treated as UTC to match Wikidot's server-side rendering behavior.
 *
 * Supported tokens: `%Y` (4-digit year), `%y` (2-digit year), `%m` (month),
 * `%d` (zero-padded day), `%e` (day), `%H` (24h hour), `%I` (12h hour),
 * `%M` (minute), `%S` (second), `%p` (AM/PM), `%b`/`%B` (month name),
 * `%a`/`%A` (day name), `%w` (weekday number), `%j` (day of year),
 * `%Z`/`%z` (timezone), `%%` (literal percent).
 *
 * @param date - The date to format
 * @param format - strftime format string
 * @returns Formatted date string
 */
function strftime(date: Date, format: string): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");

  return format.replace(STRFTIME_REGEX, (_, token: string) => {
    switch (token) {
      case "Y":
        return String(date.getFullYear());
      case "y":
        return String(date.getFullYear()).slice(-2);
      case "m":
        return pad(date.getMonth() + 1);
      case "d":
        return pad(date.getDate());
      case "e":
        return String(date.getDate());
      case "H":
        return pad(date.getHours());
      case "I":
        return pad(date.getHours() % 12 || 12);
      case "M":
        return pad(date.getMinutes());
      case "S":
        return pad(date.getSeconds());
      case "p":
        return date.getHours() < 12 ? "AM" : "PM";
      case "b":
        return MONTHS_SHORT[date.getMonth()] ?? "";
      case "B":
        return MONTHS[date.getMonth()] ?? "";
      case "a":
        return DAYS_SHORT[date.getDay()] ?? "";
      case "A":
        return DAYS[date.getDay()] ?? "";
      case "w":
        return String(date.getDay());
      case "j":
        return pad(getDayOfYear(date), 3);
      case "Z":
        return "UTC";
      case "z":
        return "+0000";
      case "%":
        return "%";
      default:
        return `%${token}`;
    }
  });
}

/**
 * Calculate the day of year (1-366) for a given date.
 *
 * @param date - The date to calculate for
 * @returns Day of year as an integer (1 = January 1st)
 */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}
