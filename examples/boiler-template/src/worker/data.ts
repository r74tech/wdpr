import { definePageData, matchesListPagesSelectors } from "@wdprlib/parser";
import type {
  ListPagesExternalData,
  ListUsersExternalData,
  NormalizedListPagesQuery,
  PageData,
  TagCloudExternalData,
} from "@wdprlib/parser";

const FULLNAME_SQL =
  "CASE WHEN p.category = '_default' THEN p.unix_name ELSE p.category || ':' || p.unix_name END";
const PAGE_SELECT = `SELECT p.id, p.category, p.unix_name, p.title, p.source,
  p.created_at, p.updated_at, p.rating, p.rating_votes, p.revision_count,
  p.comments_count, LENGTH(p.source) AS size,
  (SELECT GROUP_CONCAT(tag, CHAR(31)) FROM page_tags WHERE page_id = p.id) AS tags,
  creator.id AS created_by_id, creator.name AS created_by_name,
  creator.unix_name AS created_by_unix_name
  FROM pages p
  JOIN users creator ON creator.id = p.created_by`;

const SITE = { title: "WDPR Boiler", name: "wdpr-boiler", domain: "example.com" };
const LIST_PAGES_ORDER = {
  created_at: "p.created_at",
  updated_at: "p.updated_at",
  title: "p.title",
  fullname: FULLNAME_SQL,
} as const;
const LIST_PAGES_FIELDS = new Set(["category", "tags", "order", "offset", "limit", "reverse"]);
const D1_BIND_LIMIT = 100;
type QueryDatabase = Pick<D1Database, "prepare">;

interface PageRow {
  id: number;
  category: string;
  unix_name: string;
  title: string;
  source: string;
  created_at: string;
  updated_at: string;
  rating: number;
  rating_votes: number;
  revision_count: number;
  comments_count: number;
  size: number;
  tags: string | null;
  created_by_id: number;
  created_by_name: string;
  created_by_unix_name: string;
}

export interface WikiPage extends PageData {
  id: number;
  source: string;
}

export async function findPage(db: QueryDatabase, fullName: string): Promise<WikiPage | null> {
  const [category, name] = splitFullName(fullName);
  const row = await db
    .prepare(`${PAGE_SELECT} WHERE p.category = ? AND p.unix_name = ?`)
    .bind(category, name)
    .first<PageRow>();
  if (row === null) return null;
  return toPage(row);
}

export async function listCurrentUser(db: QueryDatabase): Promise<ListUsersExternalData | null> {
  const user = await db
    .prepare(
      "SELECT wikidot_id AS number, name AS title, unix_name AS name FROM users WHERE unix_name = 'user'",
    )
    .first<{ number: number; title: string; name: string }>();
  return user === null ? null : { user };
}

export async function listPages(
  db: QueryDatabase,
  query: NormalizedListPagesQuery,
  currentPage: WikiPage,
): Promise<ListPagesExternalData> {
  if (hasUnsupportedListPagesSelector(query)) {
    throw new Error("The boiler supports category, tags, order, offset and limit in ListPages");
  }

  const order =
    LIST_PAGES_ORDER[(query.order?.field ?? "created_at") as keyof typeof LIST_PAGES_ORDER];
  const direction = (query.order?.direction === "asc") !== Boolean(query.reverse) ? "ASC" : "DESC";
  const result = await db.prepare(`${PAGE_SELECT} ORDER BY ${order} ${direction}`).all<PageRow>();
  const pages = result.results
    .map(toPage)
    .filter((page) => matchesListPagesSelectors(page, query, currentPage));
  const offset = Math.max(query.offset ?? 0, 0);
  const limit = Math.max(0, Math.min(query.limit ?? 20, 20));
  return {
    pages: pages.slice(offset, offset + limit),
    totalCount: pages.length,
    site: SITE,
  };
}

export async function listTags(
  db: QueryDatabase,
  category: string | null,
  limit: number,
): Promise<TagCloudExternalData> {
  if (category !== null) throw new Error("The boiler supports a site-wide TagCloud");
  const result = await db
    .prepare(
      "SELECT tag, COUNT(*) AS weight FROM page_tags GROUP BY tag ORDER BY weight DESC, tag LIMIT ?",
    )
    .bind(limit)
    .all<{ tag: string; weight: number }>();
  return { status: "ok", category: null, tags: result.results };
}

export async function existingPages(
  db: QueryDatabase,
  targets: readonly string[],
): Promise<ReadonlySet<string>> {
  const unique = [...new Set(targets.map((target) => normalizeFullName(target)))];
  if (unique.length === 0) return new Set();
  const existing = new Set<string>();
  for (let offset = 0; offset < unique.length; offset += D1_BIND_LIMIT) {
    const batch = unique.slice(offset, offset + D1_BIND_LIMIT);
    const result = await db
      .prepare(
        `SELECT ${FULLNAME_SQL} AS fullname FROM pages p WHERE ${FULLNAME_SQL} IN (${batch.map(() => "?").join(",")})`,
      )
      .bind(...batch)
      .all<{ fullname: string }>();
    for (const row of result.results) existing.add(row.fullname);
  }
  return existing;
}

function hasUnsupportedListPagesSelector(query: NormalizedListPagesQuery): boolean {
  return (
    Object.keys(query).some((field) => !LIST_PAGES_FIELDS.has(field)) ||
    (query.order !== undefined && !(query.order.field in LIST_PAGES_ORDER))
  );
}

function toPage(row: PageRow): WikiPage {
  const pageTags = row.tags?.split("\u001f") ?? [];
  const fullname = row.category === "_default" ? row.unix_name : `${row.category}:${row.unix_name}`;
  return {
    id: row.id,
    source: row.source,
    ...definePageData({
      fullname,
      title: row.title,
      createdAt: validDate(row.created_at),
      createdBy: {
        id: row.created_by_id,
        name: row.created_by_name,
        unixName: row.created_by_unix_name,
      },
      updatedAt: validDate(row.updated_at),
      content: row.source,
      tags: pageTags.filter((tag) => !tag.startsWith("_")),
      hiddenTags: pageTags.filter((tag) => tag.startsWith("_")),
      comments: row.comments_count,
      size: row.size,
      rating: row.rating,
      ratingVotes: row.rating_votes,
      revisions: row.revision_count,
    }),
  };
}

function validDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid page date: ${value}`);
  return date;
}

function splitFullName(value: string): [string, string] {
  const normalized = normalizeFullName(value);
  const separator = normalized.indexOf(":");
  return separator < 0
    ? ["_default", normalized]
    : [normalized.slice(0, separator), normalized.slice(separator + 1)];
}

function normalizeFullName(value: string): string {
  return (value === "" || value === "/" ? "home" : value.replace(/^\//, "")).toLowerCase();
}
