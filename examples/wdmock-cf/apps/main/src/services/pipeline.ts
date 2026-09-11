/**
 * Wikidot rendering pipeline
 *
 * Handles source parsing, module resolution, and HTML rendering.
 */
import { matchesListPagesSelectors, processWikitext } from "@wdprlib/parser";
import type { NormalizedListPagesQuery, ListPagesExternalData } from "@wdprlib/parser";
import { renderWikitext } from "@wdprlib/render";
import { SITE, parseFullname } from "@wdmock/shared";
import { findPage, getTagsByFullname, rowToPageData } from "@wdmock/db";

// Normalized order field -> DB column mapping
const ORDER_COLUMN_MAP: Record<string, string> = {
  created_at: "date_created",
  updated_at: "date_last_edited",
  title: "title",
  fullname: "unix_name",
  rating: "rate",
  size: "LENGTH(source)",
};

export interface RenderResult {
  html: string;
  styles: string[];
}

export interface RenderPageOptions {
  files?: R2Bucket;
  filesBaseUrl?: string;
  urlPath?: string;
}

export async function renderPage(
  source: string,
  pageName: string,
  db: D1Database,
  options?: RenderPageOptions,
): Promise<RenderResult> {
  const identity = parseFullname(pageName);
  const pageTags = await getTagsByFullname(db, identity.category, identity.name);

  const document = await processWikitext(source, {
    page: {
      fullName: pageName,
      unixName: identity.name,
      tags: pageTags,
      urlPath: options?.urlPath,
      site: SITE.name,
      domain: SITE.domain,
    },
    dataProvider: {
      fetchInclude: async (pageRef) => {
        if (pageRef.site) return null;
        const included = parseFullname(pageRef.page);
        return (await findPage(db, included.category, included.name))?.source ?? null;
      },
      fetchListPages: async (query) =>
        queryListPages(db, query, {
          fullname: pageName,
          category: identity.category,
          tags: pageTags,
        }),
    },
  });
  const rendered = await renderWikitext(document, {
    styleMode: "separate",
    resolvers: {
      user: (username) => ({ name: username }),
      resolvePageExistence: (pages) => findExistingPages(db, pages),
      resolveHtmlBlockUrl: options?.files
        ? async ({ content }) => {
            const hash = await storeHtmlBlock(options.files!, pageName, content);
            return `${options.filesBaseUrl ?? ""}/local--html/${pageName}/${hash}`;
          }
        : undefined,
    },
    htmlBlockSandbox: null,
    embedAllowlist: null,
  });

  return { html: rendered.html, styles: rendered.styles };
}

async function findExistingPages(db: D1Database, pages: string[]): Promise<ReadonlySet<string>> {
  if (pages.length === 0) return new Set();
  const requestedByCanonical = new Map<string, string[]>();
  for (const page of pages) {
    const canonical = normalizePageLookupName(page);
    requestedByCanonical.set(canonical, [...(requestedByCanonical.get(canonical) ?? []), page]);
  }

  const canonicalPages = [...requestedByCanonical.keys()];
  const batches: string[][] = [];
  for (let i = 0; i < canonicalPages.length; i += D1_PAGE_EXISTENCE_BATCH_SIZE) {
    batches.push(canonicalPages.slice(i, i + D1_PAGE_EXISTENCE_BATCH_SIZE));
  }
  const results = await Promise.all(
    batches.map((batch) => {
      const placeholders = batch.map(() => "?").join(", ");
      return db
        .prepare(
          `SELECT LOWER(CASE WHEN category = '_default' THEN unix_name ELSE category || ':' || unix_name END) AS fullname
           FROM pages
           WHERE LOWER(CASE WHEN category = '_default' THEN unix_name ELSE category || ':' || unix_name END)
             IN (${placeholders})`,
        )
        .bind(...batch)
        .all<{ fullname: string }>();
    }),
  );

  const existing = new Set<string>();
  for (const result of results) {
    for (const row of result.results) {
      for (const requested of requestedByCanonical.get(row.fullname) ?? []) existing.add(requested);
    }
  }
  return existing;
}

const D1_PAGE_EXISTENCE_BATCH_SIZE = 90;

function normalizePageLookupName(page: string): string {
  let normalized = page.toLowerCase();
  if (normalized.includes(":")) normalized = normalized.replace(/:\s+/g, ":");
  if (/\s/.test(normalized)) normalized = normalized.replace(/\s+/g, "-").trim();
  if (!normalized.startsWith("/") && normalized.includes("/")) {
    normalized = normalized.replace(/\//g, "-");
  }
  return normalized.startsWith("/") ? normalized.slice(1) : normalized;
}

interface CurrentListPagesPage {
  fullname: string;
  category: string;
  tags: string[];
}

async function queryListPages(
  db: D1Database,
  query: NormalizedListPagesQuery,
  currentPage: CurrentListPagesPage,
): Promise<ListPagesExternalData> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (query.range === ".") {
    const { category, name } = parseFullname(currentPage.fullname);
    conditions.push("category = ? AND unix_name = ?");
    params.push(category, name);
  }

  if (query.name) {
    conditions.push("unix_name = ?");
    params.push(query.name);
  }

  if (query.limit === 0) {
    return { pages: [], totalCount: 0, site: SITE };
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderBy = buildOrderBy(query);
  const includeAllContent = query.limit !== undefined && query.limit < 0;
  const rows = await db
    .prepare(
      `SELECT page_id, category, unix_name, title, date_created, date_last_edited,
              owner_user_id, rate, LENGTH(source) AS source_size${includeAllContent ? ", source" : ""}
       FROM pages ${where} ${orderBy}`,
    )
    .bind(...params)
    .all();
  const tagsByPage = new Map<number, string[]>();
  const needsCandidateTags = Boolean(query.tags) || includeAllContent;
  if (needsCandidateTags) {
    const pageTags = await db
      .prepare(
        `SELECT page_id, tag FROM page_tags WHERE page_id IN (SELECT page_id FROM pages ${where})`,
      )
      .bind(...params)
      .all<{ page_id: number; tag: string }>();
    for (const { page_id: pageId, tag } of pageTags.results) {
      tagsByPage.set(pageId, [...(tagsByPage.get(pageId) ?? []), tag]);
    }
  }
  const matchedPages = (rows.results || [])
    .map((row) => ({
      pageId: row.page_id as number,
      page: rowToPageData(row, tagsByPage.get(row.page_id as number) ?? []),
    }))
    .filter(({ page }) => matchesListPagesSelectors(page, query, currentPage));
  const offset = Math.max(0, query.offset ?? 0);
  const limit = Math.min(query.limit ?? 20, query.perPage ?? 20, 250);
  const end = limit < 0 ? undefined : offset + limit;
  const selectedPages = matchedPages.slice(offset, end);
  const contentByPage = new Map<number, string>();
  const selectedTagsByPage = new Map<number, string[]>();
  for (let start = 0; !includeAllContent && start < selectedPages.length; start += 80) {
    const batch = selectedPages.slice(start, start + 80);
    const placeholders = batch.map(() => "?").join(", ");
    const pageIds = batch.map(({ pageId }) => pageId);
    const [contents, selectedTags] = await Promise.all([
      db
        .prepare(`SELECT page_id, source FROM pages WHERE page_id IN (${placeholders})`)
        .bind(...pageIds)
        .all<{ page_id: number; source: string }>(),
      needsCandidateTags
        ? null
        : db
            .prepare(`SELECT page_id, tag FROM page_tags WHERE page_id IN (${placeholders})`)
            .bind(...pageIds)
            .all<{ page_id: number; tag: string }>(),
    ]);
    for (const { page_id: pageId, source } of contents.results) {
      contentByPage.set(pageId, source);
    }
    for (const { page_id: pageId, tag } of selectedTags?.results ?? []) {
      selectedTagsByPage.set(pageId, [...(selectedTagsByPage.get(pageId) ?? []), tag]);
    }
  }

  return {
    pages: selectedPages.map(({ pageId, page }) => {
      const selectedTags = selectedTagsByPage.get(pageId);
      return {
        ...page,
        tags: selectedTags?.filter((tag) => !tag.startsWith("_")) ?? page.tags,
        hiddenTags: selectedTags?.filter((tag) => tag.startsWith("_")) ?? page.hiddenTags,
        content: includeAllContent ? page.content : contentByPage.get(pageId),
      };
    }),
    totalCount: matchedPages.length,
    site: SITE,
  };
}

function buildOrderBy(query: NormalizedListPagesQuery): string {
  if (!query.order) return "ORDER BY date_created DESC, page_id DESC";

  const column = ORDER_COLUMN_MAP[query.order.field];
  if (!column) return "ORDER BY date_created DESC, page_id DESC";

  const direction = query.order.direction === "asc" ? "ASC" : "DESC";
  return `ORDER BY ${column} ${direction}, page_id ${direction}`;
}

// R2 Storage helpers

export async function storeHtmlBlock(
  files: R2Bucket,
  pageName: string,
  content: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);

  const key = `local--html/${pageName}/${hash}`;

  await files.put(key, content, {
    httpMetadata: {
      contentType: "text/html; charset=utf-8",
    },
  });

  return hash;
}

export async function deletePageBlocks(files: R2Bucket, pageName: string): Promise<void> {
  const htmlList = await files.list({ prefix: `local--html/${pageName}/` });
  const codeList = await files.list({ prefix: `local--code/${pageName}/` });

  const keysToDelete = [
    ...htmlList.objects.map((o) => o.key),
    ...codeList.objects.map((o) => o.key),
  ];

  if (keysToDelete.length > 0) {
    await files.delete(keysToDelete);
  }
}
