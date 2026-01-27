/**
 * Tags table operations
 */

export async function getPageTags(db: D1Database, pageId: number): Promise<string[]> {
  const result = await db.prepare("SELECT tag FROM page_tags WHERE page_id = ?").bind(pageId).all();
  return (result.results || []).map((r) => r.tag as string);
}

export async function getTagsByFullname(
  db: D1Database,
  category: string,
  name: string,
): Promise<string[]> {
  const page = await db
    .prepare("SELECT page_id FROM pages WHERE category = ? AND unix_name = ?")
    .bind(category, name)
    .first<{ page_id: number }>();

  if (!page) return [];
  return getPageTags(db, page.page_id);
}
