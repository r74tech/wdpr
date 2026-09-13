/**
 * Votes table operations
 */
import { SITE } from "@wdmock/shared";

export async function upsertCustomVote(
  db: D1Database,
  userId: number,
  pageId: number,
  axisKey: string,
  points: -1 | 0 | 1,
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO page_custom_rate_vote (site_id, page_id, axis_key, user_id, rate)
       SELECT site_id, ?, axis_key, ?, ? FROM site_rating_axes
       WHERE site_id = ? AND axis_key = ? AND enabled = 1 AND can_vote = 1
         AND CASE ? WHEN 1 THEN allow_uv WHEN 0 THEN allow_nv ELSE allow_dv END = 1
       ON CONFLICT(site_id, page_id, axis_key, user_id)
       DO UPDATE SET rate = excluded.rate, date = datetime('now')`,
    )
    .bind(pageId, userId, points, SITE.id, axisKey, points)
    .run();
  return result.meta.changes > 0;
}

export async function deleteCustomVote(
  db: D1Database,
  userId: number,
  pageId: number,
  axisKey: string,
): Promise<void> {
  await db
    .prepare(
      `DELETE FROM page_custom_rate_vote
       WHERE site_id = ? AND page_id = ? AND axis_key = ? AND user_id = ?
         AND EXISTS (SELECT 1 FROM site_rating_axes
           WHERE site_id = page_custom_rate_vote.site_id
             AND axis_key = page_custom_rate_vote.axis_key AND enabled = 1 AND can_cancel = 1)`,
    )
    .bind(SITE.id, pageId, axisKey, userId)
    .run();
}

export async function upsertVote(
  db: D1Database,
  userId: number,
  pageId: number,
  points: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO page_rate_vote (user_id, page_id, rate)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, page_id) DO UPDATE SET rate = ?, date = datetime('now')`,
    )
    .bind(userId, pageId, points, points)
    .run();
}

export async function deleteVote(db: D1Database, userId: number, pageId: number): Promise<void> {
  await db
    .prepare("DELETE FROM page_rate_vote WHERE user_id = ? AND page_id = ?")
    .bind(userId, pageId)
    .run();
}

export async function recalculatePageRate(db: D1Database, pageId: number): Promise<void> {
  await db
    .prepare(
      "UPDATE pages SET rate = (SELECT COALESCE(SUM(rate), 0) FROM page_rate_vote WHERE page_id = ?) WHERE page_id = ?",
    )
    .bind(pageId, pageId)
    .run();
}
