/**
 * Wikidot rendering pipeline
 *
 * Handles source parsing, module resolution, and HTML rendering.
 */
import { parse, extractDataRequirements, resolveModules, resolveIncludes } from "@wdprlib/parser";
import type {
  NormalizedListPagesQuery,
  ListPagesExternalData,
  PageData,
  PageRef,
} from "@wdprlib/parser";
import { renderToHtml } from "@wdprlib/render";
import type { PageContext } from "@wdprlib/render";
import { SITE, getUserInfo, parseFullname, buildFullname } from "@wdmock/shared";
import { getTagsByFullname, rowToPageData, getAllPageSources } from "@wdmock/db";

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
  const pageSourceMap = await getAllPageSources(db);

  const expanded = resolveIncludes(source, (pageRef: PageRef) => {
    return pageSourceMap.get(pageRef.page) ?? null;
  });
  const { ast: resolved, diagnostics: _diagnostics = [] } = parse(expanded);

  const { requirements, compiledListPagesTemplates } = extractDataRequirements(resolved);

  const pageTags = await getTagsByFullname(
    db,
    parseFullname(pageName).category,
    parseFullname(pageName).name,
  );

  const modulesResolved = await resolveModules(
    resolved,
    {
      fetchListPages: async (query) => {
        return await queryListPages(db, query, pageName);
      },
      getPageTags: () => pageTags,
    },
    {
      parse: (input: string) => parse(input).ast,
      compiledListPagesTemplates,
      requirements,
      urlPath: options?.urlPath,
    },
  );

  const styles = modulesResolved.styles ?? [];
  const treeWithoutStyles = { ...modulesResolved, styles: [] };

  const htmlBlocks = modulesResolved["html-blocks"] ?? [];
  const htmlBlockUrls: string[] = [];

  if (options?.files && htmlBlocks.length > 0) {
    const baseUrl = options.filesBaseUrl ?? "";
    for (const content of htmlBlocks) {
      const hash = await storeHtmlBlock(options.files, pageName, content);
      htmlBlockUrls.push(`${baseUrl}/local--html/${pageName}/${hash}`);
    }
  }

  const pageContext: PageContext = {
    pageName,
    site: SITE.name,
    domain: SITE.domain,
    pageExists: () => true,
  };

  const html = renderToHtml(treeWithoutStyles, {
    page: pageContext,
    footnotes: modulesResolved.footnotes,
    resolvers: {
      htmlBlockUrl: (index) => htmlBlockUrls[index] ?? "",
      user: (username) => ({ name: username }),
    },
    htmlBlockSandbox: null,
    embedAllowlist: null,
  });

  return { html, styles };
}

async function queryListPages(
  db: D1Database,
  query: NormalizedListPagesQuery,
  currentPageFullname: string,
): Promise<ListPagesExternalData> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (query.range === ".") {
    const { category, name } = parseFullname(currentPageFullname);
    conditions.push("category = ? AND unix_name = ?");
    params.push(category, name);
  }

  if (query.category) {
    if (query.category.all) {
      // "*" - all categories, no filter
    } else if (query.category.current) {
      conditions.push("category = '_default'");
    } else {
      if (query.category.include.length > 0) {
        const placeholders = query.category.include.map(() => "?").join(", ");
        conditions.push(`category IN (${placeholders})`);
        params.push(...query.category.include);
      }
      for (const cat of query.category.exclude) {
        conditions.push("category != ?");
        params.push(cat);
      }
    }
  }

  if (query.name) {
    conditions.push("unix_name = ?");
    params.push(query.name);
  }

  if (query.tags) {
    for (const tag of query.tags.all) {
      conditions.push("page_id IN (SELECT page_id FROM page_tags WHERE tag = ?)");
      params.push(tag);
    }
    if (query.tags.any.length > 0) {
      const placeholders = query.tags.any.map(() => "?").join(", ");
      conditions.push(`page_id IN (SELECT page_id FROM page_tags WHERE tag IN (${placeholders}))`);
      params.push(...query.tags.any);
    }
    for (const tag of query.tags.none) {
      conditions.push("page_id NOT IN (SELECT page_id FROM page_tags WHERE tag = ?)");
      params.push(tag);
    }
    if (query.tags.special === "none") {
      conditions.push("page_id NOT IN (SELECT DISTINCT page_id FROM page_tags)");
    }
  }

  if (query.limit === 0) {
    return { pages: [], totalCount: 0, site: SITE };
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderBy = buildOrderBy(query);
  const limit =
    query.limit !== undefined ? `LIMIT ${Math.min(Number(query.limit), 100)}` : "LIMIT 20";
  const offset = query.offset ? `OFFSET ${Math.min(Number(query.offset), 1000)}` : "";

  const sql = `SELECT * FROM pages ${where} ${orderBy} ${limit} ${offset}`;
  const countSql = `SELECT COUNT(*) as count FROM pages ${where}`;

  const [rows, countResult] = await Promise.all([
    db
      .prepare(sql)
      .bind(...params)
      .all(),
    db
      .prepare(countSql)
      .bind(...params)
      .first<{ count: number }>(),
  ]);

  const totalCount = countResult?.count ?? 0;

  const pages: PageData[] = await Promise.all(
    (rows.results || []).map((row) => rowToPageData(db, row)),
  );

  return { pages, totalCount, site: SITE };
}

function buildOrderBy(query: NormalizedListPagesQuery): string {
  if (!query.order) return "ORDER BY date_created DESC";

  const column = ORDER_COLUMN_MAP[query.order.field];
  if (!column) return "ORDER BY date_created DESC";

  const direction = query.order.direction === "asc" ? "ASC" : "DESC";
  return `ORDER BY ${column} ${direction}`;
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
