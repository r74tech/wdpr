/**
 * Wikidot rendering pipeline
 *
 * Handles source parsing, module resolution, and HTML rendering.
 */
import {
  extractDataRequirements,
  matchesListPagesSelectors,
  processWikitext,
} from "@wdprlib/parser";
import type {
  NormalizedListPagesQuery,
  ListPagesExternalData,
  ListPagesDataRequirement,
} from "@wdprlib/parser";
import { renderWikitext } from "@wdprlib/render";
import { SITE, parseFullname } from "@wdmock/shared";
import { findPage, getTagsByFullname, rowToPageData } from "@wdmock/db";
import { readPageRatings, readRatingAxes, readCustomRatings } from "./ratings";

// Normalized order field -> DB column mapping
const ORDER_COLUMN_MAP: Record<string, string> = {
  created_at: "date_created",
  updated_at: "date_last_edited",
  title: "title",
  fullname: "unix_name",
  rating: "rate",
  votes: "rating_votes",
  // The demo has no comment storage: every page has zero comments and no timestamp.
  comments: "(0 + 0)",
  commented_at: "(NULL)",
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
      fetchInclude: (pageRef) => getIncludeSource(db, pageRef),
      fetchRatings: async (refs) => {
        const stored = await findPage(db, identity.category, identity.name);
        return stored ? readPageRatings(db, stored.page_id, refs) : [];
      },
      fetchListPages: async (query, requirement) =>
        queryListPages(
          db,
          query,
          {
            fullname: pageName,
            category: identity.category,
            tags: pageTags,
          },
          requirement,
        ),
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
           WHERE site_id = ? AND LOWER(CASE WHEN category = '_default' THEN unix_name ELSE category || ':' || unix_name END)
             IN (${placeholders})`,
        )
        .bind(SITE.id, ...batch)
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

export async function getIncludeSource(
  db: D1Database,
  reference: { site: string | null; page: string },
): Promise<string | null> {
  if (reference.site) return null;
  const included = parseFullname(reference.page);
  return (await findPage(db, included.category, included.name))?.source ?? null;
}

async function queryListPages(
  db: D1Database,
  query: NormalizedListPagesQuery,
  currentPage: CurrentListPagesPage,
  requirement: ListPagesDataRequirement,
): Promise<ListPagesExternalData> {
  // No metadata registry or materialized readable sizes exist in this demo DB.
  if (query.order?.field === "metadata" || query.order?.field === "size") {
    return { pages: [], totalCount: 0, site: SITE };
  }
  const axes = await readRatingAxes(db, [
    ...(requirement.customRateKeys ?? []),
    ...(query.ratingAxis !== undefined ? [query.ratingAxis] : []),
  ]);
  const queryAxis = axes.find((axis) => axis.axis_key === query.ratingAxis);
  if (query.ratingAxis !== undefined && (!queryAxis || queryAxis.show_aggregate !== 1)) {
    return { pages: [], totalCount: 0, site: SITE };
  }
  const conditions: string[] = ["site_id = ?"];
  const params: unknown[] = [SITE.id];

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
              owner_user_id, rate,
              (SELECT COUNT(*) FROM page_rate_vote WHERE page_rate_vote.page_id = pages.page_id) AS rating_votes${includeAllContent ? ", source" : ""}
              ${
                queryAxis
                  ? `,
                (SELECT COALESCE(SUM(rate), 0) FROM page_custom_rate_vote
                 WHERE site_id = pages.site_id AND page_id = pages.page_id AND axis_key = ?) AS axis_points,
                (SELECT COUNT(*) FROM page_custom_rate_vote
                 WHERE site_id = pages.site_id AND page_id = pages.page_id AND axis_key = ?) AS axis_votes`
                  : ""
              }
       FROM pages ${where} ${orderBy}`,
    )
    .bind(...(queryAxis ? [queryAxis.axis_key, queryAxis.axis_key] : []), ...params)
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
      points: (queryAxis ? row.axis_points : row.rate) as number,
      votes: (queryAxis ? row.axis_votes : row.rating_votes) as number,
    }))
    .filter(
      ({ page, points, votes }) =>
        matchesListPagesSelectors(page, query, currentPage) &&
        matchesNumber(points, query.rating) &&
        matchesNumber(votes, query.votes),
    );
  const offset = Math.max(0, query.offset ?? 0);
  const limit = Math.min(query.limit ?? 20, query.perPage ?? 20, 250);
  const end = limit < 0 ? undefined : offset + limit;
  const selectedPages = matchedPages.slice(offset, end);
  const displayKeys = new Set(requirement.customRateKeys);
  const customRatings = await readCustomRatings(
    db,
    selectedPages.map(({ pageId }) => pageId),
    axes.filter((axis) => displayKeys.has(axis.axis_key) && axis.show_aggregate === 1),
  );
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
    pages: await Promise.all(
      selectedPages.map(async ({ pageId, page }) => {
        const selectedTags = selectedTagsByPage.get(pageId);
        const tags = selectedTags ?? [...page.tags, ...page.hiddenTags];
        const content = includeAllContent ? page.content : contentByPage.get(pageId);
        const document =
          (requirement.needsReadableText || requirement.neededVariables.includes("size")) &&
          content !== undefined
            ? await processWikitext(content, {
                page: { fullName: page.fullname, tags, site: SITE.name },
                dataProvider: { fetchInclude: (reference) => getIncludeSource(db, reference) },
              })
            : undefined;
        const remaining = document ? extractDataRequirements(document.ast).requirements : undefined;
        const completeText =
          document &&
          document.diagnostics.length === 0 &&
          remaining?.listPages.length === 0 &&
          remaining.listUsers.length === 0 &&
          remaining.tagCloud.length === 0;
        return {
          ...page,
          customRates: Object.fromEntries(
            (customRatings.get(pageId) ?? []).flatMap((state) =>
              state.ref.kind === "custom" ? [[state.ref.axisKey, state.aggregate]] : [],
            ),
          ),
          tags: selectedTags?.filter((tag) => !tag.startsWith("_")) ?? page.tags,
          hiddenTags: selectedTags?.filter((tag) => tag.startsWith("_")) ?? page.hiddenTags,
          content,
          readableText: completeText ? document.readableText : undefined,
          firstParagraph: completeText ? document.firstParagraph : undefined,
          size: completeText ? document.characterCount : undefined,
        };
      }),
    ),
    totalCount: matchedPages.length,
    site: SITE,
  };
}

function buildOrderBy(query: NormalizedListPagesQuery): string {
  if (!query.order) return "ORDER BY date_created DESC, page_id DESC";

  const column =
    query.ratingAxis !== undefined && query.order.field === "rating"
      ? "axis_points"
      : query.ratingAxis !== undefined && query.order.field === "votes"
        ? "axis_votes"
        : ORDER_COLUMN_MAP[query.order.field];
  if (!column) return "ORDER BY date_created DESC, page_id DESC";

  const direction = query.order.direction === "asc" ? "ASC" : "DESC";
  return `ORDER BY ${column} ${direction}, page_id ${direction}`;
}

function matchesNumber(value: number, selector: NormalizedListPagesQuery["rating"]): boolean {
  if (!selector) return true;
  switch (selector.op) {
    case "=":
      return value === selector.value;
    case "<":
      return value < selector.value;
    case ">":
      return value > selector.value;
    case "<=":
      return value <= selector.value;
    case ">=":
      return value >= selector.value;
  }
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
