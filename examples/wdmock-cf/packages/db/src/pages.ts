/**
 * Pages table operations
 */

import type { PageData } from "@wdprlib/parser";
import { getUserInfo, buildFullname } from "@wdmock/shared";

export interface PageApiData {
  page_id: number;
  title: string;
  source: string;
  is_locked?: boolean;
}

export async function findPage(
  db: D1Database,
  category: string,
  name: string,
): Promise<PageApiData | null> {
  return db
    .prepare(
      "SELECT page_id, title, source, is_locked FROM pages WHERE category = ? AND unix_name = ?",
    )
    .bind(category, name)
    .first<PageApiData>();
}

export async function getAllPageSources(db: D1Database): Promise<Map<string, string>> {
  const result = await db
    .prepare("SELECT category, unix_name, source FROM pages")
    .all<{ category: string; unix_name: string; source: string }>();

  const map = new Map<string, string>();
  for (const row of result.results || []) {
    map.set(buildFullname(row.category, row.unix_name), row.source);
  }
  return map;
}

export async function createPage(
  db: D1Database,
  category: string,
  name: string,
  title: string,
  source: string,
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO pages (site_id, category, unix_name, title, source, owner_user_id)
       VALUES (1, ?, ?, ?, ?, 2)`,
    )
    .bind(category, name, title, source)
    .run();
  return result.meta.last_row_id as number;
}

export async function updatePage(
  db: D1Database,
  pageId: number,
  title: string,
  source: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE pages SET title = ?, source = ?, date_last_edited = datetime('now')
       WHERE page_id = ?`,
    )
    .bind(title, source, pageId)
    .run();
}

export async function deletePage(db: D1Database, pageId: number): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM page_tags WHERE page_id = ?").bind(pageId),
    db.prepare("DELETE FROM page_rate_vote WHERE page_id = ?").bind(pageId),
    db.prepare("DELETE FROM pages WHERE page_id = ?").bind(pageId),
  ]);
}

export async function rowToPageData(
  db: D1Database,
  row: Record<string, unknown>,
): Promise<PageData> {
  const pageId = row.page_id as number;

  const tagsResult = await db
    .prepare("SELECT tag FROM page_tags WHERE page_id = ?")
    .bind(pageId)
    .all();
  const tags = (tagsResult.results || []).map((r) => r.tag as string);

  const category = row.category as string;
  const unixName = row.unix_name as string;

  return {
    name: unixName,
    category,
    fullname: buildFullname(category, unixName),
    title: (row.title as string) || unixName,
    createdAt: new Date(row.date_created as string),
    createdBy: getUserInfo(row.owner_user_id as number),
    updatedAt: new Date(row.date_last_edited as string),
    updatedBy: getUserInfo(row.owner_user_id as number),
    tags,
    hiddenTags: [],
    children: 0,
    comments: 0,
    size: ((row.source as string) || "").length,
    rating: (row.rate as number) || 0,
    ratingVotes: 0,
    revisions: 1,
    content: (row.source as string) || undefined,
  };
}
